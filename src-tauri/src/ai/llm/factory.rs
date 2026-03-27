//! LLM 工厂类
//!
//! 统一创建不同 provider 的 LLM 客户端

use crate::ai::llm::types::{
    LlmCompletionParams, LlmCompletionResult, LlmProvider, LlmRuntimeConfig,
};
use crate::entity::llm_config;
use futures::StreamExt;
use rig::client::{CompletionClient, Nothing};
use rig::completion::Prompt;
use rig::providers::{anthropic, gemini, ollama, openai};
use rig::streaming::StreamingPrompt;
use tokio::sync::mpsc::UnboundedSender;

pub struct LlmFactory;

impl LlmFactory {
    pub fn create_runtime_config(config: &llm_config::Model) -> LlmRuntimeConfig {
        let extra_config = config.extra_config.as_ref();

        LlmRuntimeConfig {
            provider: config.provider.clone(),
            model: config.model.clone(),
            api_key: config.api_key.clone(),
            base_url: config.base_url.clone(),
            temperature: extra_config
                .and_then(|v| v.get("temperature"))
                .and_then(|v| v.as_f64())
                .map(|v| v as f32),
            max_tokens: extra_config
                .and_then(|v| v.get("max_tokens"))
                .and_then(|v| v.as_u64())
                .map(|v| v as u32),
        }
    }

    pub fn create_rig_client(config: &LlmRuntimeConfig) -> anyhow::Result<Box<dyn LlmClient>> {
        match LlmProvider::from(config.provider.as_str()) {
            LlmProvider::OpenAi => Ok(Box::new(OpenAiCompatibleClient::new(config))),
            LlmProvider::Anthropic => Ok(Box::new(AnthropicClient::new(config))),
            LlmProvider::Gemini => Ok(Box::new(GeminiClient::new(config))),
            LlmProvider::Ollama => Ok(Box::new(OllamaClient::new(config))),
            LlmProvider::Other(name) => Err(anyhow::anyhow!(
                "不支持的 LLM 提供商: {}。当前支持 openai / anthropic / gemini / ollama",
                name
            )),
        }
    }
}

#[async_trait::async_trait]
pub trait LlmClient: Send + Sync {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult>;
    async fn stream_complete(
        &self,
        params: LlmCompletionParams,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<LlmCompletionResult>;
    #[allow(dead_code)]
    fn provider(&self) -> &str;
    #[allow(dead_code)]
    fn model(&self) -> &str;
}

pub struct OpenAiCompatibleClient {
    config: LlmRuntimeConfig,
}

impl OpenAiCompatibleClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }

    fn build_client_with_key(&self, api_key: &str) -> anyhow::Result<openai::CompletionsClient> {
        let mut builder = openai::CompletionsClient::builder().api_key(api_key);

        if let Some(base_url) = self.config.effective_base_url() {
            builder = builder.base_url(&base_url);
        }

        builder
            .build()
            .map_err(|e| anyhow::anyhow!("创建 OpenAI 兼容 client 失败: {}", e))
    }
}

pub struct AnthropicClient {
    config: LlmRuntimeConfig,
}

impl AnthropicClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }

    fn build_client_with_key(&self, api_key: &str) -> anyhow::Result<anthropic::Client> {
        let mut builder = anthropic::Client::builder().api_key(api_key);

        if let Some(base_url) = self.config.effective_base_url() {
            builder = builder.base_url(&base_url);
        }

        builder
            .build()
            .map_err(|e| anyhow::anyhow!("创建 Anthropic client 失败: {}", e))
    }
}

pub struct GeminiClient {
    config: LlmRuntimeConfig,
}

impl GeminiClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }

    fn build_client_with_key(&self, api_key: &str) -> anyhow::Result<gemini::Client> {
        let mut builder = gemini::Client::builder().api_key(api_key);

        if let Some(base_url) = self.config.effective_base_url() {
            builder = builder.base_url(&base_url);
        }

        builder
            .build()
            .map_err(|e| anyhow::anyhow!("创建 Gemini client 失败: {}", e))
    }
}

pub struct OllamaClient {
    config: LlmRuntimeConfig,
}

impl OllamaClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }

    fn build_client(&self) -> anyhow::Result<ollama::Client> {
        let mut builder = ollama::Client::builder().api_key(Nothing);

        if let Some(base_url) = self.config.effective_base_url() {
            builder = builder.base_url(&base_url);
        }

        builder
            .build()
            .map_err(|e| anyhow::anyhow!("创建 Ollama client 失败: {}", e))
    }
}

fn apply_common_builder_options<M>(
    mut builder: rig::agent::AgentBuilder<M>,
    params: &LlmCompletionParams,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> rig::agent::AgentBuilder<M>
where
    M: rig::completion::CompletionModel,
{
    if !params.system_prompt.trim().is_empty() {
        builder = builder.preamble(&params.system_prompt);
    }
    if let Some(temp) = params.temperature.or(temperature) {
        builder = builder.temperature(temp.into());
    }
    if let Some(max_tokens) = params.max_tokens.or(max_tokens) {
        builder = builder.max_tokens(max_tokens as u64);
    }
    builder
}

fn should_retry_with_another_key(error: &anyhow::Error) -> bool {
    let message = error.to_string().to_lowercase();
    message.contains("401")
        || message.contains("unauthorized")
        || message.contains("invalid api key")
        || message.contains("license is not enabled")
        || message.contains("api key")
}

macro_rules! impl_keyed_rig_client {
    ($client_name:ident, $build_method:ident) => {
        #[async_trait::async_trait]
        impl LlmClient for $client_name {
            async fn complete(
                &self,
                params: LlmCompletionParams,
            ) -> anyhow::Result<LlmCompletionResult> {
                let first_key = self.config.effective_api_key();
                let client = self.$build_method(&first_key)?;
                let builder = client.agent(&self.config.model);
                let builder = apply_common_builder_options(
                    builder,
                    &params,
                    self.config.temperature,
                    self.config.max_tokens,
                );

                let agent = builder.build();
                match agent.prompt(&params.user_prompt).await {
                    Ok(content) => Ok(LlmCompletionResult {
                        content,
                        token_usage: None,
                    }),
                    Err(err) => {
                        let first_error = anyhow::anyhow!(err.to_string());
                        if should_retry_with_another_key(&first_error) {
                            let retry_key = self.config.random_api_key(Some(&first_key));
                            if !retry_key.is_empty() && retry_key != first_key {
                                let retry_client = self.$build_method(&retry_key)?;
                                let retry_builder = retry_client.agent(&self.config.model);
                                let retry_builder = apply_common_builder_options(
                                    retry_builder,
                                    &params,
                                    self.config.temperature,
                                    self.config.max_tokens,
                                );
                                let retry_agent = retry_builder.build();
                                let content = retry_agent.prompt(&params.user_prompt).await?;
                                return Ok(LlmCompletionResult {
                                    content,
                                    token_usage: None,
                                });
                            }
                        }

                        Err(first_error)
                    }
                }
            }

            async fn stream_complete(
                &self,
                params: LlmCompletionParams,
                tx: UnboundedSender<String>,
            ) -> anyhow::Result<LlmCompletionResult> {
                let first_key = self.config.effective_api_key();
                let client = self.$build_method(&first_key)?;
                let builder = client.agent(&self.config.model);
                let builder = apply_common_builder_options(
                    builder,
                    &params,
                    self.config.temperature,
                    self.config.max_tokens,
                );

                let agent = builder.build();
                let mut stream = agent.stream_prompt(&params.user_prompt).await;
                let mut content = String::new();

                while let Some(item) = stream.next().await {
                    match item {
                        Ok(rig::agent::MultiTurnStreamItem::StreamAssistantItem(
                            rig::streaming::StreamedAssistantContent::Text(text),
                        )) => {
                            content.push_str(&text.text);
                            let _ = tx.send(text.text);
                        }
                        Ok(_) => {}
                        Err(err) => {
                            let first_error = anyhow::anyhow!(err.to_string());
                            if should_retry_with_another_key(&first_error) {
                                let retry_key = self.config.random_api_key(Some(&first_key));
                                if !retry_key.is_empty() && retry_key != first_key {
                                    let retry_client = self.$build_method(&retry_key)?;
                                    let retry_builder = retry_client.agent(&self.config.model);
                                    let retry_builder = apply_common_builder_options(
                                        retry_builder,
                                        &params,
                                        self.config.temperature,
                                        self.config.max_tokens,
                                    );
                                    let retry_agent = retry_builder.build();
                                    let mut retry_stream = retry_agent.stream_prompt(&params.user_prompt).await;
                                    let mut retry_content = String::new();
                                    while let Some(retry_item) = retry_stream.next().await {
                                        match retry_item {
                                            Ok(rig::agent::MultiTurnStreamItem::StreamAssistantItem(
                                                rig::streaming::StreamedAssistantContent::Text(text),
                                            )) => {
                                                retry_content.push_str(&text.text);
                                                let _ = tx.send(text.text);
                                            }
                                            Ok(_) => {}
                                            Err(retry_err) => return Err(anyhow::anyhow!(retry_err.to_string())),
                                        }
                                    }
                                    return Ok(LlmCompletionResult {
                                        content: retry_content,
                                        token_usage: None,
                                    });
                                }
                            }
                            return Err(first_error);
                        }
                    }
                }

                Ok(LlmCompletionResult {
                    content,
                    token_usage: None,
                })
            }

            fn provider(&self) -> &str {
                &self.config.provider
            }

            fn model(&self) -> &str {
                &self.config.model
            }
        }
    };
}

#[async_trait::async_trait]
impl LlmClient for OllamaClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        let client = self.build_client()?;
        let builder = client.agent(&self.config.model);
        let builder = apply_common_builder_options(
            builder,
            &params,
            self.config.temperature,
            self.config.max_tokens,
        );

        let agent = builder.build();
        let content = agent.prompt(&params.user_prompt).await?;

        Ok(LlmCompletionResult {
            content,
            token_usage: None,
        })
    }

    async fn stream_complete(
        &self,
        params: LlmCompletionParams,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<LlmCompletionResult> {
        let client = self.build_client()?;
        let builder = client.agent(&self.config.model);
        let builder = apply_common_builder_options(
            builder,
            &params,
            self.config.temperature,
            self.config.max_tokens,
        );

        let agent = builder.build();
        let mut stream = agent.stream_prompt(&params.user_prompt).await;
        let mut content = String::new();

        while let Some(item) = stream.next().await {
            match item {
                Ok(rig::agent::MultiTurnStreamItem::StreamAssistantItem(
                    rig::streaming::StreamedAssistantContent::Text(text),
                )) => {
                    content.push_str(&text.text);
                    let _ = tx.send(text.text);
                }
                Ok(_) => {}
                Err(err) => return Err(anyhow::anyhow!(err.to_string())),
            }
        }

        Ok(LlmCompletionResult {
            content,
            token_usage: None,
        })
    }

    fn provider(&self) -> &str {
        &self.config.provider
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}

impl_keyed_rig_client!(OpenAiCompatibleClient, build_client_with_key);
impl_keyed_rig_client!(AnthropicClient, build_client_with_key);
impl_keyed_rig_client!(GeminiClient, build_client_with_key);
