//! Agent Trait 定义
//!
//! 定义所有 Agent 必须实现的接口

use crate::entity::llm_config;
use serde::de::DeserializeOwned;
use serde_json::Value;
use tokio::sync::mpsc::UnboundedSender;

/// Agent 上下文
#[derive(Debug, Clone)]
pub struct AgentContext {
    /// 输入参数
    pub input: Value,
    /// 额外的上下文数据
    pub metadata: Option<Value>,
}

impl AgentContext {
    /// 创建新的上下文
    pub fn new(input: Value) -> Self {
        Self {
            input,
            metadata: None,
        }
    }

    /// 创建带元数据的上下文
    pub fn with_metadata(input: Value, metadata: Value) -> Self {
        Self {
            input,
            metadata: Some(metadata),
        }
    }

    /// 解析输入参数为指定类型
    pub fn parse<T: DeserializeOwned>(&self) -> anyhow::Result<T> {
        serde_json::from_value(self.input.clone()).map_err(|e| anyhow::anyhow!("解析输入参数失败: {}", e))
    }
}

/// Agent 执行上下文
#[derive(Debug, Clone)]
pub struct AgentExecutionContext {
    /// 系统提示词
    pub system_prompt: String,
    /// 用户自定义提示词
    pub custom_prompt: Option<String>,
    /// 额外的执行参数
    pub extra_params: Option<Value>,
}

impl AgentExecutionContext {
    /// 创建新的执行上下文
    pub fn new(system_prompt: String) -> Self {
        Self {
            system_prompt,
            custom_prompt: None,
            extra_params: None,
        }
    }

    /// 合并自定义提示词
    pub fn merge_custom_prompt(&self) -> String {
        match &self.custom_prompt {
            Some(custom) if !custom.trim().is_empty() => {
                format!("{}\n\n{}", self.system_prompt, custom)
            }
            _ => self.system_prompt.clone(),
        }
    }
}

/// Agent Handler Trait
///
/// 所有 Agent 必须实现此 trait
#[async_trait::async_trait]
pub trait AgentHandler: Send + Sync {
    /// 获取 Agent 代码
    fn code(&self) -> &'static str;

    /// 获取 Agent 名称
    fn name(&self) -> &'static str;

    /// 获取 Agent 描述
    fn description(&self) -> &'static str;

    /// 构建用户提示词
    ///
    /// 根据输入上下文构建发送给 LLM 的用户提示词
    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String>;

    /// 执行 Agent
    ///
    /// 默认实现：构建提示词并调用 LLM
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
        let result = executor.complete(&system_prompt, &user_prompt).await?;

        Ok(result)
    }

    /// 流式执行 Agent
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

/// Agent 结果
#[derive(Debug, Clone)]
pub struct AgentResult {
    /// 生成的内容
    pub content: String,
    /// 使用的 LLM 配置 ID
    pub llm_config_id: i32,
    /// 使用的提供商
    pub provider: String,
    /// 使用的模型
    pub model: String,
}
