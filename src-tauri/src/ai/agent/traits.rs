//! Agent Trait 定义
//!
//! 定义所有 Agent 必须实现的接口

use crate::entity::llm_config;
use serde::de::DeserializeOwned;
use serde_json::Value;
use tokio::sync::mpsc::UnboundedSender;

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

    pub fn parse<T>(&self) -> anyhow::Result<T>
    where
        T: DeserializeOwned,
    {
        Ok(serde_json::from_value(self.input.clone())?)
    }
}

#[derive(Debug, Clone)]
pub struct AgentExecutionContext {
    pub system_prompt: String,
    pub custom_prompt: Option<String>,
    pub extra_params: Option<Value>,
}

impl AgentExecutionContext {
    pub fn new(system_prompt: String) -> Self {
        Self {
            system_prompt,
            custom_prompt: None,
            extra_params: None,
        }
    }

    pub fn merge_custom_prompt(&self) -> String {
        match &self.custom_prompt {
            Some(custom) if !custom.trim().is_empty() => format!("{}

{}", self.system_prompt, custom),
            _ => self.system_prompt.clone(),
        }
    }
}

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
        use crate::ai::llm::executor::LlmExecutor;

        let user_prompt = self.build_user_prompt(ctx).await?;
        let system_prompt = exec_ctx.merge_custom_prompt();
        let executor = LlmExecutor::from_config(llm)?;
        executor.complete(&system_prompt, &user_prompt).await
    }

    async fn execute_stream(
        &self,
        llm: &llm_config::Model,
        exec_ctx: AgentExecutionContext,
        ctx: AgentContext,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<String> {
        use crate::ai::llm::executor::LlmExecutor;

        let user_prompt = self.build_user_prompt(ctx).await?;
        let system_prompt = exec_ctx.merge_custom_prompt();
        let executor = LlmExecutor::from_config(llm)?;
        executor.stream_complete(&system_prompt, &user_prompt, tx).await
    }
}

#[derive(Debug, Clone)]
pub struct AgentResult {
    pub content: String,
    pub llm_config_id: i32,
    pub provider: String,
    pub model: String,
}
