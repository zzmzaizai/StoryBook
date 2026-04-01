use crate::ai::hooks::ObservedToolHook;
use crate::ai::llm::factory::{
    apply_common_builder_options, should_retry_with_another_key, AnthropicClient, GeminiClient,
    OllamaClient, OpenAiCompatibleClient, DEFAULT_COMPLETION_TIMEOUT_SECS,
};
use crate::ai::llm::types::{LlmCompletionParams, LlmProvider, LlmRuntimeConfig};
use crate::entity::llm_config;
use futures::StreamExt;
use rig::agent::MultiTurnStreamItem;
use rig::client::completion::CompletionClient;
use rig::message::Message;
use rig::streaming::StreamingPrompt;
use rig::tool::ToolDyn;
use tokio::sync::mpsc::UnboundedSender;

pub struct LlmToolStreamExecutor {
    config: LlmRuntimeConfig,
}

impl LlmToolStreamExecutor {
    pub fn from_config(config: &llm_config::Model) -> anyhow::Result<Self> {
        Ok(Self {
            config: crate::ai::llm::factory::LlmFactory::create_runtime_config(config),
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn stream_with_tools<F>(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        timeout_secs: Option<u64>,
        retries: u64,
        max_turns: usize,
        additional_params: Option<serde_json::Value>,
        build_tools: &F,
        hook: ObservedToolHook,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<String>
    where
        F: Fn() -> Vec<Box<dyn ToolDyn>>,
    {
        match LlmProvider::from(self.config.provider.as_str()) {
            LlmProvider::OpenAi => {
                let helper = OpenAiCompatibleClient::new(&self.config);
                self.stream_keyed_with_retry::<openai::CompletionsClient, _, _>(
                    |api_key| {
                        helper.build_client_with_key(
                            api_key,
                            timeout_secs.or(Some(DEFAULT_COMPLETION_TIMEOUT_SECS)),
                        )
                    },
                    system_prompt,
                    user_prompt,
                    retries,
                    max_turns,
                    additional_params,
                    build_tools,
                    hook,
                    tx,
                )
                .await
            }
            LlmProvider::Anthropic => {
                let helper = AnthropicClient::new(&self.config);
                self.stream_keyed_with_retry::<anthropic::Client, _, _>(
                    |api_key| {
                        helper.build_client_with_key(
                            api_key,
                            timeout_secs.or(Some(DEFAULT_COMPLETION_TIMEOUT_SECS)),
                        )
                    },
                    system_prompt,
                    user_prompt,
                    retries,
                    max_turns,
                    additional_params,
                    build_tools,
                    hook,
                    tx,
                )
                .await
            }
            LlmProvider::Gemini => {
                let helper = GeminiClient::new(&self.config);
                self.stream_keyed_with_retry::<gemini::Client, _, _>(
                    |api_key| {
                        helper.build_client_with_key(
                            api_key,
                            timeout_secs.or(Some(DEFAULT_COMPLETION_TIMEOUT_SECS)),
                        )
                    },
                    system_prompt,
                    user_prompt,
                    retries,
                    max_turns,
                    additional_params,
                    build_tools,
                    hook,
                    tx,
                )
                .await
            }
            LlmProvider::Ollama => {
                let helper = OllamaClient::new(&self.config);
                let client =
                    helper.build_client(timeout_secs.or(Some(DEFAULT_COMPLETION_TIMEOUT_SECS)))?;
                self.stream_with_client::<ollama::Client, _>(
                    client,
                    system_prompt,
                    user_prompt,
                    retries,
                    max_turns,
                    additional_params,
                    build_tools,
                    hook,
                    tx,
                )
                .await
            }
            LlmProvider::Other(name) => Err(anyhow::anyhow!(
                "不支持的 LLM 提供商: {}。当前支持 openai / anthropic / gemini / ollama",
                name
            )),
        }
    }

    #[allow(clippy::too_many_arguments)]
    async fn stream_keyed_with_retry<C, FClient, FTools>(
        &self,
        build_client: FClient,
        system_prompt: &str,
        user_prompt: &str,
        retries: u64,
        max_turns: usize,
        additional_params: Option<serde_json::Value>,
        build_tools: &FTools,
        hook: ObservedToolHook,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<String>
    where
        C: CompletionClient,
        C::CompletionModel: 'static,
        FClient: Fn(&str) -> anyhow::Result<C>,
        FTools: Fn() -> Vec<Box<dyn ToolDyn>>,
    {
        let first_key = self.config.effective_api_key();
        let client = build_client(&first_key)?;

        match self
            .stream_with_client::<C, _>(
                client,
                system_prompt,
                user_prompt,
                retries,
                max_turns,
                additional_params.clone(),
                build_tools,
                hook.clone(),
                tx.clone(),
            )
            .await
        {
            Ok(result) => Ok(result),
            Err(err) => {
                if should_retry_with_another_key(&err) {
                    let retry_key = self.config.random_api_key(Some(&first_key));
                    if !retry_key.is_empty() && retry_key != first_key {
                        let retry_client = build_client(&retry_key)?;
                        return self
                            .stream_with_client::<C, _>(
                                retry_client,
                                system_prompt,
                                user_prompt,
                                retries,
                                max_turns,
                                additional_params,
                                build_tools,
                                hook,
                                tx,
                            )
                            .await;
                    }
                }

                Err(err)
            }
        }
    }

    #[allow(clippy::too_many_arguments)]
    async fn stream_with_client<C, F>(
        &self,
        client: C,
        system_prompt: &str,
        user_prompt: &str,
        retries: u64,
        max_turns: usize,
        additional_params: Option<serde_json::Value>,
        build_tools: &F,
        hook: ObservedToolHook,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<String>
    where
        C: CompletionClient,
        C::CompletionModel: 'static,
        F: Fn() -> Vec<Box<dyn ToolDyn>>,
    {
        let params = LlmCompletionParams {
            system_prompt: system_prompt.to_string(),
            user_prompt: user_prompt.to_string(),
            additional_params,
            ..Default::default()
        };

        let max_attempts = retries.max(1);
        let mut last_error = None;

        for _ in 0..max_attempts {
            let tools = build_tools();
            let builder = apply_common_builder_options(
                client.agent(&self.config.model),
                &params,
                self.config.temperature,
                self.config.max_tokens,
            )
            .tools(tools)
            .default_max_turns(max_turns);

            let agent = builder.build();
            let mut stream = agent
                .stream_prompt(Message::user(user_prompt))
                .multi_turn(max_turns)
                .with_hook(hook.clone())
                .await;

            let mut final_response = String::new();
            while let Some(item) = stream.next().await {
                match item {
                    Ok(MultiTurnStreamItem::StreamAssistantItem(content)) => {
                        if let rig::streaming::StreamedAssistantContent::Text(text) = content {
                            let delta = text.text;
                            if !delta.is_empty() {
                                let _ = tx.send(delta.clone());
                                final_response.push_str(&delta);
                            }
                        }
                    }
                    Ok(MultiTurnStreamItem::FinalResponse(response)) => {
                        final_response = response.response().to_string();
                    }
                    Ok(_) => {}
                    Err(err) => {
                        last_error = Some(anyhow::anyhow!(err.to_string()));
                        break;
                    }
                }
            }

            if last_error.is_none() {
                return Ok(final_response);
            }
        }

        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("流式生成失败")))
    }
}

use rig::providers::{anthropic, gemini, ollama, openai};
