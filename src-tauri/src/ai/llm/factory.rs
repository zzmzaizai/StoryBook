//! LLM 工厂类
//!
//! 统一创建不同 provider 的 LLM 客户端

use crate::ai::llm::provider::LlmProvider;
use crate::ai::llm::types::{LlmCompletionParams, LlmCompletionResult, LlmRuntimeConfig};
use crate::entity::llm_config;

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

/// LLM 客户端 trait
///
/// 定义所有 LLM 客户端必须实现的接口
#[async_trait::async_trait]
pub trait LlmClient: Send + Sync {
    /// 执行对话补全
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult>;

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
        // TODO: 使用 rig 实现 OpenAI 调用
        // 示例：
        // let client = rig::providers::openai::Client::new(
        //     self.config.api_key.clone().unwrap_or_default()
        // );
        // let agent = client
        //     .agent(&self.config.model)
        //     .preamble(&params.system_prompt)
        //     .build();
        // let response = agent.prompt(&params.user_prompt).await?;

        Ok(LlmCompletionResult {
            content: format!("[OpenAI Mock] {}", params.user_prompt),
            token_usage: None,
        })
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
        // TODO: 使用 rig 实现 Anthropic 调用
        Ok(LlmCompletionResult {
            content: format!("[Anthropic Mock] {}", params.user_prompt),
            token_usage: None,
        })
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
        // TODO: 使用 rig 实现 DeepSeek 调用
        Ok(LlmCompletionResult {
            content: format!("[DeepSeek Mock] {}", params.user_prompt),
            token_usage: None,
        })
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
        // TODO: 使用 rig 实现 Gemini 调用
        Ok(LlmCompletionResult {
            content: format!("[Gemini Mock] {}", params.user_prompt),
            token_usage: None,
        })
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
        // TODO: 使用 rig 实现 Ollama 调用
        Ok(LlmCompletionResult {
            content: format!("[Ollama Mock] {}", params.user_prompt),
            token_usage: None,
        })
    }

    fn provider(&self) -> &str {
        "ollama"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}
