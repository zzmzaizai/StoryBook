//! LLM 类型定义
//!
//! 与 RIG 框架对齐的简化类型

use serde::{Deserialize, Serialize};

/// LLM 提供商枚举
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum LlmProvider {
    OpenAi,
    OpenAiResponses,
    Anthropic,
    DeepSeek,
    Gemini,
    Ollama,
    Other(String),
}

impl LlmProvider {
    pub fn as_str(&self) -> &str {
        match self {
            LlmProvider::OpenAi => "openai",
            LlmProvider::OpenAiResponses => "openai_responses",
            LlmProvider::Anthropic => "anthropic",
            LlmProvider::DeepSeek => "deepseek",
            LlmProvider::Gemini => "gemini",
            LlmProvider::Ollama => "ollama",
            LlmProvider::Other(s) => s.as_str(),
        }
    }

    pub fn requires_api_key(&self) -> bool {
        !matches!(self, LlmProvider::Ollama)
    }

    pub fn default_base_url(&self) -> Option<&'static str> {
        match self {
            LlmProvider::OpenAi => Some("https://api.openai.com/v1"),
            LlmProvider::OpenAiResponses => Some("https://api.openai.com/v1"),
            LlmProvider::Anthropic => Some("https://api.anthropic.com"),
            LlmProvider::DeepSeek => Some("https://api.deepseek.com"),
            LlmProvider::Gemini => Some("https://generativelanguage.googleapis.com"),
            LlmProvider::Ollama => Some("http://localhost:11434/v1"),
            LlmProvider::Other(_) => None,
        }
    }

    pub fn uses_responses_api(&self) -> bool {
        matches!(self, LlmProvider::OpenAiResponses)
    }
}

impl From<&str> for LlmProvider {
    fn from(value: &str) -> Self {
        match value.to_lowercase().as_str() {
            "openai" => LlmProvider::OpenAi,
            "openai_responses" => LlmProvider::OpenAiResponses,
            "anthropic" => LlmProvider::Anthropic,
            "deepseek" => LlmProvider::DeepSeek,
            "gemini" => LlmProvider::Gemini,
            "ollama" => LlmProvider::Ollama,
            other => LlmProvider::Other(other.to_string()),
        }
    }
}

impl std::fmt::Display for LlmProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// LLM 运行时配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    pub provider: LlmProvider,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u64>,
}

impl LlmConfig {
    pub fn new(provider: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            provider: LlmProvider::from(provider.into().as_str()),
            model: model.into(),
            api_key: None,
            base_url: None,
            temperature: None,
            max_tokens: None,
        }
    }

    pub fn with_api_key(mut self, api_key: impl Into<String>) -> Self {
        self.api_key = Some(api_key.into());
        self
    }

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.base_url = Some(base_url.into());
        self
    }

    pub fn with_temperature(mut self, temperature: f64) -> Self {
        self.temperature = Some(temperature);
        self
    }

    pub fn with_max_tokens(mut self, max_tokens: u64) -> Self {
        self.max_tokens = Some(max_tokens);
        self
    }

    pub fn effective_base_url(&self) -> String {
        if let Some(ref url) = self.base_url {
            url.trim_end_matches('/').to_string()
        } else {
            self.provider
                .default_base_url()
                .unwrap_or("https://api.openai.com/v1")
                .to_string()
        }
    }

    /// 从多个密钥中随机选择一个
    /// 密钥用逗号分隔，支持多个密钥轮询
    pub fn random_api_key(&self) -> String {
        match &self.api_key {
            Some(keys) => {
                let key_list: Vec<&str> = keys
                    .split(',')
                    .map(|k| k.trim())
                    .filter(|k| !k.is_empty())
                    .collect();

                if key_list.is_empty() {
                    String::new()
                } else if key_list.len() == 1 {
                    key_list[0].to_string()
                } else {
                    use std::time::{SystemTime, UNIX_EPOCH};
                    let now = SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_nanos() as usize;
                    let index = now % key_list.len();
                    key_list[index].to_string()
                }
            }
            None => String::new(),
        }
    }
}

impl From<crate::entity::llm_config::Model> for LlmConfig {
    fn from(config: crate::entity::llm_config::Model) -> Self {
        let extra = config.extra_config.as_ref();
        Self {
            provider: LlmProvider::from(config.provider.as_str()),
            model: config.model,
            api_key: config.api_key,
            base_url: config.base_url,
            temperature: extra.and_then(|v| v.get("temperature").and_then(|t| t.as_f64())),
            max_tokens: extra.and_then(|v| v.get("max_tokens").and_then(|t| t.as_u64())),
        }
    }
}

impl From<&crate::entity::llm_config::Model> for LlmConfig {
    fn from(config: &crate::entity::llm_config::Model) -> Self {
        Self::from(config.clone())
    }
}

/// 流式响应块
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    pub kind: String,
    pub content: String,
    pub is_done: bool,
    pub usage: Option<TokenUsage>,
}

impl StreamChunk {
    pub fn text(content: impl Into<String>) -> Self {
        Self {
            kind: "text".to_string(),
            content: content.into(),
            is_done: false,
            usage: None,
        }
    }

    pub fn tool_name(content: impl Into<String>) -> Self {
        Self {
            kind: "tool_name".to_string(),
            content: content.into(),
            is_done: false,
            usage: None,
        }
    }

    pub fn tool_delta(content: impl Into<String>) -> Self {
        Self {
            kind: "tool_delta".to_string(),
            content: content.into(),
            is_done: false,
            usage: None,
        }
    }

    pub fn reasoning(content: impl Into<String>) -> Self {
        Self {
            kind: "reasoning".to_string(),
            content: content.into(),
            is_done: false,
            usage: None,
        }
    }

    pub fn reasoning_delta(content: impl Into<String>) -> Self {
        Self {
            kind: "reasoning_delta".to_string(),
            content: content.into(),
            is_done: false,
            usage: None,
        }
    }

    pub fn error(content: impl Into<String>) -> Self {
        Self {
            kind: "error".to_string(),
            content: content.into(),
            is_done: false,
            usage: None,
        }
    }

    pub fn usage(usage: TokenUsage) -> Self {
        Self {
            kind: "usage".to_string(),
            content: String::new(),
            is_done: false,
            usage: Some(usage),
        }
    }

    pub fn done() -> Self {
        Self {
            kind: "done".to_string(),
            content: String::new(),
            is_done: true,
            usage: None,
        }
    }
}

/// Token 使用统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
}

impl TokenUsage {
    pub fn new(prompt: u64, completion: u64) -> Self {
        Self {
            prompt_tokens: prompt,
            completion_tokens: completion,
            total_tokens: prompt + completion,
        }
    }
}

/// LLM 调用结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionResult {
    pub content: String,
    pub token_usage: Option<TokenUsage>,
}

impl CompletionResult {
    pub fn new(content: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            token_usage: None,
        }
    }

    pub fn with_usage(mut self, usage: TokenUsage) -> Self {
        self.token_usage = Some(usage);
        self
    }
}

impl From<String> for CompletionResult {
    fn from(content: String) -> Self {
        Self::new(content)
    }
}
