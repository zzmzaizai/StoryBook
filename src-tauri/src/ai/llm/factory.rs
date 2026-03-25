//! LLM 工厂类
//!
//! 统一创建不同 provider 的 LLM 客户端

use crate::ai::llm::types::{LlmCompletionParams, LlmCompletionResult, LlmProvider, LlmRuntimeConfig};
use crate::entity::llm_config;
use futures::StreamExt;
use rig::agent::MultiTurnStreamItem;
use rig::completion::message::Text;
use rig::client::CompletionClient;
use rig::completion::Prompt;
use rig::providers::openai;
use rig::streaming::{StreamedAssistantContent, StreamingPrompt};
use tokio::sync::mpsc::UnboundedSender;

/// LLM 工厂类
///
/// 负责根据配置创建对应的 LLM 客户端实例
pub struct LlmFactory;

impl LlmFactory {
    /// 从数据库配置创建 LLM 运行时配置
    pub fn create_runtime_config(config: &llm_config::Model) -> LlmRuntimeConfig {
        let extra_config = config.extra_config.as_ref();

        LlmRuntimeConfig {
            provider: config.provider.clone(),
            model: config.model.clone(),
            api_key: config.api_key.clone(),
            base_url: config.base_url.clone(),
            temperature: extra_config.and_then(|v| v.get("temperature").and_then(|t| t.as_f64().map(|f| f as f32))),
            max_tokens: extra_config.and_then(|v| v.get("max_tokens").and_then(|t| t.as_u64().map(|u| u as u32))),
        }
    }

    /// 创建 rig 客户端
    ///
    /// 根据 provider 类型创建对应的 rig 客户端
    pub fn create_rig_client(config: &LlmRuntimeConfig) -> anyhow::Result<Box<dyn LlmClient>> {
        let provider = LlmProvider::from(config.provider.as_str());

        match provider {
            LlmProvider::OpenAi => Ok(Box::new(OpenAiClient::new(config))),
            LlmProvider::Anthropic => Ok(Box::new(AnthropicClient::new(config))),
            LlmProvider::DeepSeek => Ok(Box::new(DeepSeekClient::new(config))),
            LlmProvider::Gemini => Ok(Box::new(GeminiClient::new(config))),
            LlmProvider::Ollama => Ok(Box::new(OllamaClient::new(config))),
            LlmProvider::Other(name) => Err(anyhow::anyhow!("不支持的 LLM 提供商: {}", name)),
        }
    }
}

fn require_api_key(config: &LlmRuntimeConfig, provider: &str) -> anyhow::Result<String> {
    config
        .api_key
        .clone()
        .filter(|key| !key.trim().is_empty())
        .ok_or_else(|| anyhow::anyhow!("{} 未配置 API Key", provider))
}

async fn complete_with_openai_compatible(
    config: &LlmRuntimeConfig,
    params: LlmCompletionParams,
    provider_name: &str,
    default_base_url: Option<&str>,
) -> anyhow::Result<LlmCompletionResult> {
    let api_key = require_api_key(config, provider_name)?;

    let mut builder = openai::Client::builder().api_key(&api_key);

    if let Some(base_url) = config.base_url.as_deref().or(default_base_url) {
        if !base_url.trim().is_empty() {
            builder = builder.base_url(base_url);
        }
    }

    let client = builder.build()?;

    let agent = client
        .agent(&config.model)
        .preamble(&params.system_prompt)
        .build();

    let response = agent.prompt(&params.user_prompt).await?;

    Ok(LlmCompletionResult {
        content: response,
        token_usage: None,
    })
}

async fn stream_with_openai_compatible(
    config: &LlmRuntimeConfig,
    params: LlmCompletionParams,
    provider_name: &str,
    default_base_url: Option<&str>,
    tx: UnboundedSender<String>,
) -> anyhow::Result<LlmCompletionResult> {
    let api_key = require_api_key(config, provider_name)?;

    let mut builder = openai::Client::builder().api_key(&api_key);

    if let Some(base_url) = config.base_url.as_deref().or(default_base_url) {
        if !base_url.trim().is_empty() {
            builder = builder.base_url(base_url);
        }
    }

    let client = builder.build()?;

    let agent = client
        .agent(&config.model)
        .preamble(&params.system_prompt)
        .build();

    let mut stream = agent.stream_prompt(&params.user_prompt).await;
    let mut content = String::new();

    while let Some(chunk) = stream.next().await {
        match chunk {
            Ok(MultiTurnStreamItem::StreamAssistantItem(StreamedAssistantContent::Text(
                Text { text },
            ))) => {
                content.push_str(&text);
                let _ = tx.send(text);
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

/// LLM 客户端 trait
///
/// 定义所有 LLM 客户端必须实现的接口
#[async_trait::async_trait]
pub trait LlmClient: Send + Sync {
    /// 执行对话补全
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult>;

    /// 流式执行对话补全
    async fn stream_complete(
        &self,
        params: LlmCompletionParams,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<LlmCompletionResult>;

    /// 获取提供商名称
    fn provider(&self) -> &str;

    /// 获取模型名称
    fn model(&self) -> &str;
}

// ==================== 各提供商客户端实现 ====================

/// OpenAI 客户端
pub struct OpenAiClient {
    config: LlmRuntimeConfig,
}

impl OpenAiClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for OpenAiClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        complete_with_openai_compatible(&self.config, params, "OpenAI", None).await
    }

    async fn stream_complete(
        &self,
        params: LlmCompletionParams,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<LlmCompletionResult> {
        stream_with_openai_compatible(&self.config, params, "OpenAI", None, tx).await
    }

    fn provider(&self) -> &str {
        "openai"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}

/// Anthropic 客户端
pub struct AnthropicClient {
    config: LlmRuntimeConfig,
}

impl AnthropicClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for AnthropicClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        Err(anyhow::anyhow!(
            "Anthropic 真实调用暂未接入，请先使用 OpenAI / DeepSeek / Ollama(openai-compatible) 配置"
        ))
    }

    async fn stream_complete(
        &self,
        _params: LlmCompletionParams,
        _tx: UnboundedSender<String>,
    ) -> anyhow::Result<LlmCompletionResult> {
        Err(anyhow::anyhow!(
            "Anthropic 流式调用暂未接入，请先使用 OpenAI / DeepSeek / Ollama(openai-compatible) 配置"
        ))
    }

    fn provider(&self) -> &str {
        "anthropic"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}

/// DeepSeek 客户端
pub struct DeepSeekClient {
    config: LlmRuntimeConfig,
}

impl DeepSeekClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for DeepSeekClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        complete_with_openai_compatible(
            &self.config,
            params,
            "DeepSeek",
            Some("https://api.deepseek.com/v1"),
        )
        .await
    }

    async fn stream_complete(
        &self,
        params: LlmCompletionParams,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<LlmCompletionResult> {
        stream_with_openai_compatible(
            &self.config,
            params,
            "DeepSeek",
            Some("https://api.deepseek.com/v1"),
            tx,
        )
        .await
    }

    fn provider(&self) -> &str {
        "deepseek"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}

/// Gemini 客户端
pub struct GeminiClient {
    config: LlmRuntimeConfig,
}

impl GeminiClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for GeminiClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        Err(anyhow::anyhow!(
            "Gemini 真实调用暂未接入，请先使用 OpenAI / DeepSeek / Ollama(openai-compatible) 配置"
        ))
    }

    async fn stream_complete(
        &self,
        _params: LlmCompletionParams,
        _tx: UnboundedSender<String>,
    ) -> anyhow::Result<LlmCompletionResult> {
        Err(anyhow::anyhow!(
            "Gemini 流式调用暂未接入，请先使用 OpenAI / DeepSeek / Ollama(openai-compatible) 配置"
        ))
    }

    fn provider(&self) -> &str {
        "gemini"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}

/// Ollama 客户端
pub struct OllamaClient {
    config: LlmRuntimeConfig,
}

impl OllamaClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for OllamaClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        let openai_compatible = LlmRuntimeConfig {
            api_key: Some(self.config.api_key.clone().unwrap_or_else(|| "ollama".to_string())),
            base_url: Some(
                self.config
                    .base_url
                    .clone()
                    .unwrap_or_else(|| "http://127.0.0.1:11434/v1".to_string()),
            ),
            ..self.config.clone()
        };

        complete_with_openai_compatible(&openai_compatible, params, "Ollama", None).await
    }

    async fn stream_complete(
        &self,
        params: LlmCompletionParams,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<LlmCompletionResult> {
        let openai_compatible = LlmRuntimeConfig {
            api_key: Some(self.config.api_key.clone().unwrap_or_else(|| "ollama".to_string())),
            base_url: Some(
                self.config
                    .base_url
                    .clone()
                    .unwrap_or_else(|| "http://127.0.0.1:11434/v1".to_string()),
            ),
            ..self.config.clone()
        };

        stream_with_openai_compatible(&openai_compatible, params, "Ollama", None, tx).await
    }

    fn provider(&self) -> &str {
        "ollama"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}
