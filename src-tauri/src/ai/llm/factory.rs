//! LLM 工厂类
//!
//! 统一创建不同 provider 的 LLM 客户端

use crate::ai::llm::types::{LlmCompletionParams, LlmCompletionResult, LlmProvider, LlmRuntimeConfig};
use crate::entity::llm_config;
use futures::StreamExt;
use rig::client::CompletionClient;
use rig::completion::Prompt;
use rig::providers::openai;
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
            LlmProvider::OpenAi
            | LlmProvider::DeepSeek
            | LlmProvider::OpenRouter
            | LlmProvider::Ollama => Ok(Box::new(OpenAiCompatibleClient::new(config))),
            LlmProvider::Anthropic | LlmProvider::Gemini => Err(anyhow::anyhow!(
                "当前 provider '{}' 还不是 OpenAI Chat Completions 兼容接口，请改用兼容网关或 openai/deepseek/openrouter/ollama provider",
                config.provider
            )),
            LlmProvider::Other(name) => Err(anyhow::anyhow!(
                "不支持的 LLM 提供商: {}。当前仅支持 OpenAI Chat Completions 兼容 provider",
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
    fn provider(&self) -> &str;
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

    fn build_client(&self) -> anyhow::Result<openai::CompletionsClient> {
        let api_key = self.config.effective_api_key();
        let mut builder = openai::CompletionsClient::builder().api_key(&api_key);

        if let Some(base_url) = self.config.effective_base_url() {
            builder = builder.base_url(&base_url);
        }

        builder.build().map_err(|e| anyhow::anyhow!("创建 LLM client 失败: {}", e))
    }

}

#[async_trait::async_trait]
impl LlmClient for OpenAiCompatibleClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        let client = self.build_client()?;
        let mut builder = client.agent(&self.config.model);

        if !params.system_prompt.trim().is_empty() {
            builder = builder.preamble(&params.system_prompt);
        }
        if let Some(temp) = params.temperature.or(self.config.temperature) {
            builder = builder.temperature(temp.into());
        }
        if let Some(max_tokens) = params.max_tokens.or(self.config.max_tokens) {
            builder = builder.max_tokens(max_tokens as u64);
        }

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
        let mut builder = client.agent(&self.config.model);

        if !params.system_prompt.trim().is_empty() {
            builder = builder.preamble(&params.system_prompt);
        }
        if let Some(temp) = params.temperature.or(self.config.temperature) {
            builder = builder.temperature(temp.into());
        }
        if let Some(max_tokens) = params.max_tokens.or(self.config.max_tokens) {
            builder = builder.max_tokens(max_tokens as u64);
        }

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
