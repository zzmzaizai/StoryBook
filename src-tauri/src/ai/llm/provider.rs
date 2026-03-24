/// LLM 提供商枚举
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LlmProvider {
    OpenAi,
    Anthropic,
    DeepSeek,
    Gemini,
    Ollama,
    Other(String),
}

impl LlmProvider {
    /// 获取提供商代码
    pub fn as_str(&self) -> &str {
        match self {
            LlmProvider::OpenAi => "openai",
            LlmProvider::Anthropic => "anthropic",
            LlmProvider::DeepSeek => "deepseek",
            LlmProvider::Gemini => "gemini",
            LlmProvider::Ollama => "ollama",
            LlmProvider::Other(s) => s.as_str(),
        }
    }

    /// 是否需要 API Key
    pub fn requires_api_key(&self) -> bool {
        !matches!(self, LlmProvider::Ollama)
    }

    /// 获取默认 base URL
    pub fn default_base_url(&self) -> Option<String> {
        match self {
            LlmProvider::OpenAi => Some("https://api.openai.com/v1".to_string()),
            LlmProvider::Anthropic => Some("https://api.anthropic.com".to_string()),
            LlmProvider::DeepSeek => Some("https://api.deepseek.com".to_string()),
            LlmProvider::Gemini => Some("https://generativelanguage.googleapis.com".to_string()),
            LlmProvider::Ollama => Some("http://localhost:11434".to_string()),
            LlmProvider::Other(_) => None,
        }
    }
}

impl From<&str> for LlmProvider {
    fn from(value: &str) -> Self {
        match value.to_lowercase().as_str() {
            "openai" => LlmProvider::OpenAi,
            "anthropic" => LlmProvider::Anthropic,
            "deepseek" => LlmProvider::DeepSeek,
            "gemini" => LlmProvider::Gemini,
            "ollama" => LlmProvider::Ollama,
            other => LlmProvider::Other(other.to_string()),
        }
    }
}

impl From<String> for LlmProvider {
    fn from(value: String) -> Self {
        LlmProvider::from(value.as_str())
    }
}
