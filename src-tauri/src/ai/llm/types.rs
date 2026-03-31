use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum LlmProvider {
    OpenAi,
    Anthropic,
    Gemini,
    Ollama,
    Other(String),
}

impl From<&str> for LlmProvider {
    fn from(value: &str) -> Self {
        match value.to_lowercase().as_str() {
            "openai" => Self::OpenAi,
            "anthropic" => Self::Anthropic,
            "gemini" => Self::Gemini,
            "ollama" => Self::Ollama,
            other => Self::Other(other.to_string()),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmRuntimeConfig {
    pub provider: String,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

impl LlmRuntimeConfig {
    pub fn api_keys(&self) -> Vec<String> {
        self.api_key
            .as_deref()
            .unwrap_or_default()
            .split([',', '，', ';', '\n', '\r'])
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(ToOwned::to_owned)
            .collect()
    }

    pub fn effective_api_key(&self) -> String {
        self.random_api_key(None)
    }

    pub fn random_api_key(&self, exclude: Option<&str>) -> String {
        let api_keys = self.api_keys();
        let available_keys: Vec<&String> = api_keys
            .iter()
            .filter(|key| exclude.is_none_or(|excluded| key.as_str() != excluded))
            .collect();

        match available_keys.len() {
            0 => self
                .api_key
                .as_deref()
                .unwrap_or_default()
                .trim()
                .to_string(),
            1 => available_keys[0].clone().to_string(),
            len => {
                let nanos = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|duration| duration.as_nanos())
                    .unwrap_or(0);
                let index = (nanos % len as u128) as usize;
                available_keys[index].clone().to_string()
            }
        }
    }

    pub fn effective_base_url(&self) -> Option<String> {
        self.base_url
            .as_ref()
            .map(|value| value.trim().trim_end_matches('/').to_string())
            .filter(|value| !value.is_empty())
    }
}

#[cfg(test)]
mod tests {
    use super::LlmRuntimeConfig;

    fn runtime_config(api_key: Option<&str>) -> LlmRuntimeConfig {
        LlmRuntimeConfig {
            provider: "openai".to_string(),
            model: "gpt-4o-mini".to_string(),
            api_key: api_key.map(ToOwned::to_owned),
            base_url: None,
            temperature: None,
            max_tokens: None,
        }
    }

    #[test]
    fn parses_comma_separated_api_keys() {
        let config = runtime_config(Some(" key-1, key-2 ,, key-3 "));

        assert_eq!(config.api_keys(), vec!["key-1", "key-2", "key-3"]);
    }

    #[test]
    fn keeps_single_api_key_trimmed() {
        let config = runtime_config(Some(" key-1 "));

        assert_eq!(config.effective_api_key(), "key-1");
    }

    #[test]
    fn handles_empty_api_key() {
        let config = runtime_config(Some("   "));

        assert_eq!(config.effective_api_key(), "");
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmCompletionResult {
    pub content: String,
    pub token_usage: Option<TokenUsage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Default)]
pub struct LlmCompletionParams {
    pub system_prompt: String,
    pub user_prompt: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub timeout_secs: Option<u64>,
    pub additional_params: Option<serde_json::Value>,
}
