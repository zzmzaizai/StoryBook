//! Agent Trait 定义
//!
//! 定义所有 Agent 必须实现的接口，支持 TypedPrompt

use crate::ai::llm::{CompletionResult, LlmConfig, StreamChunk};
use crate::entity::llm_config;
use schemars::JsonSchema;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Value;

/// Agent 执行上下文
#[derive(Debug, Clone)]
pub struct AgentExecutionContext {
    pub system_prompt: String,
    pub custom_prompt: Option<String>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u64>,
}

impl AgentExecutionContext {
    pub fn new(system_prompt: impl Into<String>) -> Self {
        Self {
            system_prompt: system_prompt.into(),
            custom_prompt: None,
            temperature: None,
            max_tokens: None,
        }
    }

    pub fn with_custom_prompt(mut self, prompt: impl Into<String>) -> Self {
        self.custom_prompt = Some(prompt.into());
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

    pub fn merge_prompts(&self) -> String {
        match &self.custom_prompt {
            Some(custom) if !custom.trim().is_empty() => {
                format!("{}\n\n{}", self.system_prompt, custom)
            }
            _ => self.system_prompt.clone(),
        }
    }
}

/// Agent 上下文
#[derive(Debug, Clone)]
pub struct AgentContext {
    pub input: Value,
    pub metadata: Option<Value>,
}

impl AgentContext {
    pub fn new(input: Value) -> Self {
        Self {
            input,
            metadata: None,
        }
    }

    pub fn with_metadata(input: Value, metadata: Value) -> Self {
        Self {
            input,
            metadata: Some(metadata),
        }
    }

    pub fn parse<T: DeserializeOwned>(&self) -> anyhow::Result<T> {
        serde_json::from_value(self.input.clone())
            .map_err(|e| anyhow::anyhow!("Failed to parse context input: {}", e))
    }
}

/// Agent Handler Trait
///
/// 所有 Agent 必须实现此 trait
#[async_trait::async_trait]
pub trait AgentHandler: Send + Sync {
    fn code(&self) -> &'static str;
    fn name(&self) -> &'static str;
    fn description(&self) -> &'static str;

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String>;

    async fn execute(
        &self,
        llm: &llm_config::Model,
        exec_ctx: AgentExecutionContext,
        ctx: AgentContext,
    ) -> anyhow::Result<String> {
        let config = LlmConfig::from(llm);
        let executor = crate::ai::llm::LlmExecutor::new(&config)?;
        
        let user_prompt = self.build_user_prompt(ctx).await?;
        let system_prompt = exec_ctx.merge_prompts();
        
        let result = executor.complete(&system_prompt, &user_prompt).await?;
        Ok(result.content)
    }
}

/// Typed Agent Handler Trait
///
/// 支持结构化输出的 Agent
#[async_trait::async_trait]
pub trait TypedAgentHandler<T>: AgentHandler
where
    T: JsonSchema + DeserializeOwned + Serialize + Send + 'static,
{
    fn parse_output(&self, content: &str) -> anyhow::Result<T> {
        serde_json::from_str(content)
            .map_err(|e| anyhow::anyhow!("Failed to parse typed output: {}", e))
    }
}

/// Agent 执行结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentResult {
    pub content: String,
    pub llm_config_id: i32,
    pub provider: String,
    pub model: String,
    pub token_usage: Option<crate::ai::llm::TokenUsage>,
}

impl AgentResult {
    pub fn new(content: impl Into<String>, llm_config_id: i32, provider: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            llm_config_id,
            provider: provider.into(),
            model: model.into(),
            token_usage: None,
        }
    }

    pub fn with_usage(mut self, usage: crate::ai::llm::TokenUsage) -> Self {
        self.token_usage = Some(usage);
        self
    }

    pub fn parse<T: DeserializeOwned>(&self) -> anyhow::Result<T> {
        serde_json::from_str(&self.content)
            .map_err(|e| anyhow::anyhow!("Failed to parse agent result: {}", e))
    }
}

/// 流式 Agent 结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamAgentResult {
    pub content: String,
    pub is_complete: bool,
    pub llm_config_id: i32,
    pub provider: String,
    pub model: String,
}

impl StreamAgentResult {
    pub fn chunk(content: impl Into<String>, llm_config_id: i32, provider: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            content: content.into(),
            is_complete: false,
            llm_config_id,
            provider: provider.into(),
            model: model.into(),
        }
    }

    pub fn complete(llm_config_id: i32, provider: impl Into<String>, model: impl Into<String>) -> Self {
        Self {
            content: String::new(),
            is_complete: true,
            llm_config_id,
            provider: provider.into(),
            model: model.into(),
        }
    }
}

/// 聊天消息
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

impl ChatMessage {
    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: "user".to_string(),
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: "assistant".to_string(),
            content: content.into(),
        }
    }

    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: "system".to_string(),
            content: content.into(),
        }
    }
}
