use crate::ai::hooks::ObservedToolHook;
use crate::ai::llm::factory::{
    apply_common_builder_options, should_retry_with_another_key, AnthropicClient, GeminiClient,
    OllamaClient, OpenAiCompatibleClient, DEFAULT_COMPLETION_TIMEOUT_SECS,
};
use crate::ai::llm::types::{LlmCompletionParams, LlmProvider, LlmRuntimeConfig};
use crate::entity::llm_config;
use rig::agent::PromptResponse;
use rig::client::completion::CompletionClient;
use rig::completion::{AssistantContent, Prompt, ToolDefinition};
use rig::message::{Message, ToolCall, ToolChoice, ToolFunction};
use rig::tool::ToolDyn;
use schemars::JsonSchema;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::marker::PhantomData;

pub struct LlmTypedExecutor {
    config: LlmRuntimeConfig,
}

impl LlmTypedExecutor {
    pub fn from_config(config: &llm_config::Model) -> anyhow::Result<Self> {
        Ok(Self {
            config: crate::ai::llm::factory::LlmFactory::create_runtime_config(config),
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn prompt_structured_with_tools<T, F>(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        timeout_secs: Option<u64>,
        retries: u64,
        max_turns: usize,
        additional_params: Option<serde_json::Value>,
        build_tools: &F,
        hook: ObservedToolHook,
    ) -> anyhow::Result<T>
    where
        T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
        F: Fn() -> Vec<Box<dyn ToolDyn>>,
    {
        match LlmProvider::from(self.config.provider.as_str()) {
            LlmProvider::OpenAi => {
                let helper = OpenAiCompatibleClient::new(&self.config);
                self.prompt_keyed_with_retry::<T, openai::CompletionsClient, _, _>(
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
                )
                .await
            }
            LlmProvider::Anthropic => {
                let helper = AnthropicClient::new(&self.config);
                self.prompt_keyed_with_retry::<T, anthropic::Client, _, _>(
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
                )
                .await
            }
            LlmProvider::Gemini => {
                let helper = GeminiClient::new(&self.config);
                self.prompt_keyed_with_retry::<T, gemini::Client, _, _>(
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
                )
                .await
            }
            LlmProvider::Ollama => {
                let helper = OllamaClient::new(&self.config);
                let client =
                    helper.build_client(timeout_secs.or(Some(DEFAULT_COMPLETION_TIMEOUT_SECS)))?;
                self.prompt_with_client::<T, ollama::Client, _>(
                    client,
                    system_prompt,
                    user_prompt,
                    retries,
                    max_turns,
                    additional_params,
                    build_tools,
                    hook,
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
    async fn prompt_keyed_with_retry<T, C, FClient, FTools>(
        &self,
        build_client: FClient,
        system_prompt: &str,
        user_prompt: &str,
        retries: u64,
        max_turns: usize,
        additional_params: Option<serde_json::Value>,
        build_tools: &FTools,
        hook: ObservedToolHook,
    ) -> anyhow::Result<T>
    where
        T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
        C: CompletionClient,
        FClient: Fn(&str) -> anyhow::Result<C>,
        FTools: Fn() -> Vec<Box<dyn ToolDyn>>,
    {
        let first_key = self.config.effective_api_key();
        let client = build_client(&first_key)?;

        match self
            .prompt_with_client::<T, C, _>(
                client,
                system_prompt,
                user_prompt,
                retries,
                max_turns,
                additional_params.clone(),
                build_tools,
                hook.clone(),
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
                            .prompt_with_client::<T, C, _>(
                                retry_client,
                                system_prompt,
                                user_prompt,
                                retries,
                                max_turns,
                                additional_params,
                                build_tools,
                                hook,
                            )
                            .await;
                    }
                }

                Err(err)
            }
        }
    }

    #[allow(clippy::too_many_arguments)]
    async fn prompt_with_client<T, C, F>(
        &self,
        client: C,
        system_prompt: &str,
        user_prompt: &str,
        retries: u64,
        max_turns: usize,
        additional_params: Option<serde_json::Value>,
        build_tools: &F,
        hook: ObservedToolHook,
    ) -> anyhow::Result<T>
    where
        T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
        C: CompletionClient,
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
            let mut tools = build_tools();
            tools.push(Box::new(SubmitTool::<T> { _marker: PhantomData }));
            let builder = apply_common_builder_options(
                client.agent(&self.config.model),
                &params,
                self.config.temperature,
                self.config.max_tokens,
            )
            .tools(tools)
            .tool_choice(ToolChoice::Required)
            .default_max_turns(max_turns);

            let agent = builder.build();
            match agent
                .prompt(Message::user(user_prompt))
                .max_turns(max_turns)
                .extended_details()
                .with_hook(hook.clone())
                .await
            {
                Ok(response) => match extract_submit_payload::<T>(response) {
                    Ok(parsed) => return Ok(parsed),
                    Err(err) => last_error = Some(err),
                },
                Err(err) => last_error = Some(anyhow::anyhow!(err.to_string())),
            }
        }

        Err(last_error.unwrap_or_else(|| anyhow::anyhow!("结构化生成失败")))
    }
}

fn truncate_output(output: &str, limit: usize) -> String {
    let compact = output.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut chars = compact.chars();
    let shortened: String = chars.by_ref().take(limit).collect();
    if chars.next().is_some() {
        format!("{}...", shortened)
    } else {
        shortened
    }
}

fn extract_submit_payload<T>(response: PromptResponse) -> anyhow::Result<T>
where
    T: DeserializeOwned,
{
    let raw_output = response.output;
    let messages = response.messages.unwrap_or_default();

    let payload = messages
        .into_iter()
        .rev()
        .find_map(|message| match message {
            Message::Assistant { content, .. } => content.into_iter().find_map(|item| match item {
                AssistantContent::ToolCall(ToolCall {
                    function: ToolFunction { name, arguments },
                    ..
                }) if name == "submit" => Some(arguments),
                _ => None,
            }),
            _ => None,
        })
        .ok_or_else(|| {
            anyhow::anyhow!(
                "结构化生成失败：模型未通过 submit tool 提交结果。原始输出: {}",
                truncate_output(&raw_output, 240)
            )
        })?;

    serde_json::from_value::<T>(payload).map_err(|err| {
        anyhow::anyhow!(
            "结构化生成失败：{}。原始输出: {}",
            err,
            truncate_output(&raw_output, 240)
        )
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct SubmitTool<T> {
    _marker: PhantomData<T>,
}

#[derive(Debug)]
struct SubmitToolError;

impl std::fmt::Display for SubmitToolError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "SubmitError")
    }
}

impl std::error::Error for SubmitToolError {}

impl<T> rig::tool::Tool for SubmitTool<T>
where
    T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
{
    const NAME: &'static str = "submit";
    type Error = SubmitToolError;
    type Args = T;
    type Output = T;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "Submit the final structured timeline result. Always call this tool with the final title and content.".to_string(),
            parameters: serde_json::to_value(schemars::schema_for!(T))
                .unwrap_or_else(|_| serde_json::json!({"type": "object"})),
        }
    }

    async fn call(&self, data: Self::Args) -> Result<Self::Output, Self::Error> {
        Ok(data)
    }
}

use rig::providers::{anthropic, gemini, ollama, openai};
