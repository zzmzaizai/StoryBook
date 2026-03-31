//! Agent Trait 定义
//!
//! 定义所有 Agent 必须实现的接口

use crate::ai::prompts::{render_user_template, PromptConfig};
use crate::entity::llm_config;
use serde::de::DeserializeOwned;
use serde_json::Value;
use tokio::sync::mpsc::UnboundedSender;

#[derive(Debug, Clone)]
pub struct AgentContext {
    pub input: Value,
    #[allow(dead_code)]
    pub metadata: Option<Value>,
}

impl AgentContext {
    pub fn new(input: Value) -> Self {
        Self {
            input,
            metadata: None,
        }
    }

    #[allow(dead_code)]
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
    pub prompt_config: PromptConfig,
    pub extra_params: Option<Value>,
}

impl AgentExecutionContext {
    #[allow(dead_code)]
    pub fn new(system_prompt: String) -> Self {
        Self {
            system_prompt,
            custom_prompt: None,
            prompt_config: PromptConfig {
                system_prompt: String::new(),
                user_template: None,
                output_format: None,
                extra: Default::default(),
            },
            extra_params: None,
        }
    }

    pub fn resolve_prompt(&self) -> String {
        match &self.custom_prompt {
            Some(custom) if !custom.trim().is_empty() => custom.trim().to_string(),
            _ => self.system_prompt.clone(),
        }
    }
}

#[async_trait::async_trait]
pub trait AgentHandler: Send + Sync {
    fn code(&self) -> &'static str;
    #[allow(dead_code)]
    fn name(&self) -> &'static str;
    #[allow(dead_code)]
    fn description(&self) -> &'static str;
    async fn build_prompt_params(&self, _ctx: &AgentContext) -> anyhow::Result<Option<Value>> {
        Ok(None)
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String>;

    async fn resolve_user_prompt(
        &self,
        exec_ctx: &AgentExecutionContext,
        ctx: &AgentContext,
    ) -> anyhow::Result<String> {
        if let Some(template) = exec_ctx.prompt_config.user_template.as_deref() {
            if let Some(params) = self.build_prompt_params(ctx).await? {
                return render_user_template(template, &params);
            }
        }

        self.build_user_prompt(ctx.clone()).await
    }

    async fn execute(
        &self,
        llm: &llm_config::Model,
        exec_ctx: AgentExecutionContext,
        ctx: AgentContext,
    ) -> anyhow::Result<String> {
        self.execute_with_timeout(llm, exec_ctx, ctx, None).await
    }

    async fn execute_with_timeout(
        &self,
        llm: &llm_config::Model,
        exec_ctx: AgentExecutionContext,
        ctx: AgentContext,
        timeout_secs: Option<u64>,
    ) -> anyhow::Result<String> {
        use crate::ai::llm::executor::LlmExecutor;

        let user_prompt = self.resolve_user_prompt(&exec_ctx, &ctx).await?;
        let system_prompt = exec_ctx.resolve_prompt();
        let executor = LlmExecutor::from_config(llm)?;
        executor
            .complete_with_timeout(
                &system_prompt,
                &user_prompt,
                timeout_secs,
                exec_ctx.extra_params.clone(),
            )
            .await
    }

    async fn execute_stream(
        &self,
        llm: &llm_config::Model,
        exec_ctx: AgentExecutionContext,
        ctx: AgentContext,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<String> {
        use crate::ai::llm::executor::LlmExecutor;

        let user_prompt = self.resolve_user_prompt(&exec_ctx, &ctx).await?;
        let system_prompt = exec_ctx.resolve_prompt();
        let executor = LlmExecutor::from_config(llm)?;
        executor
            .stream_complete(
                &system_prompt,
                &user_prompt,
                tx,
                exec_ctx.extra_params.clone(),
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct AgentResult {
    pub content: String,
    pub llm_config_id: i32,
    pub provider: String,
    pub model: String,
}
