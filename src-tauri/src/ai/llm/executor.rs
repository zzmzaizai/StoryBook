//! LLM 执行器
//!
//! 负责执行 LLM 调用，管理对话流程

use crate::ai::llm::factory::{LlmClient, LlmFactory};
use crate::ai::llm::types::{LlmCompletionParams, LlmCompletionResult, LlmRuntimeConfig};
use crate::entity::llm_config;

/// LLM 执行器
///
/// 封装 LLM 调用逻辑，提供统一的调用接口
pub struct LlmExecutor {
    client: Box<dyn LlmClient>,
}

impl LlmExecutor {
    /// 从数据库配置创建执行器
    pub fn from_config(config: &llm_config::Model) -> anyhow::Result<Self> {
        let runtime_config = LlmFactory::create_runtime_config(config);
        let client = LlmFactory::create_rig_client(&runtime_config)?;
        Ok(Self { client })
    }

    /// 从运行时配置创建执行器
    pub fn from_runtime_config(config: &LlmRuntimeConfig) -> anyhow::Result<Self> {
        let client = LlmFactory::create_rig_client(config)?;
        Ok(Self { client })
    }

    /// 执行单次对话补全
    ///
    /// # 参数
    /// - `system_prompt`: 系统提示词
    /// - `user_prompt`: 用户提示词
    ///
    /// # 返回
    /// LLM 生成的内容
    pub async fn complete(
        &self,
        system_prompt: &str,
        user_prompt: &str,
    ) -> anyhow::Result<String> {
        let params = LlmCompletionParams {
            system_prompt: system_prompt.to_string(),
            user_prompt: user_prompt.to_string(),
            ..Default::default()
        };

        let result = self.client.complete(params).await?;
        Ok(result.content)
    }

    /// 执行带参数的补全
    ///
    /// # 参数
    /// - `params`: 完整的调用参数
    ///
    /// # 返回
    /// 包含内容和 token 使用统计的结果
    pub async fn complete_with_params(
        &self,
        params: LlmCompletionParams,
    ) -> anyhow::Result<LlmCompletionResult> {
        self.client.complete(params).await
    }

    /// 获取提供商名称
    pub fn provider(&self) -> &str {
        self.client.provider()
    }

    /// 获取模型名称
    pub fn model(&self) -> &str {
        self.client.model()
    }
}

/// LLM 执行器构建器
///
/// 用于链式构建 LLM 执行器
pub struct LlmExecutorBuilder {
    config: Option<LlmRuntimeConfig>,
    db_config: Option<llm_config::Model>,
}

impl LlmExecutorBuilder {
    /// 创建新的构建器
    pub fn new() -> Self {
        Self {
            config: None,
            db_config: None,
        }
    }

    /// 使用运行时配置
    pub fn with_runtime_config(mut self, config: LlmRuntimeConfig) -> Self {
        self.config = Some(config);
        self
    }

    /// 使用数据库配置
    pub fn with_db_config(mut self, config: llm_config::Model) -> Self {
        self.db_config = Some(config);
        self
    }

    /// 构建执行器
    pub fn build(self) -> anyhow::Result<LlmExecutor> {
        if let Some(config) = self.config {
            LlmExecutor::from_runtime_config(&config)
        } else if let Some(config) = self.db_config {
            LlmExecutor::from_config(&config)
        } else {
            Err(anyhow::anyhow!("必须提供 LLM 配置"))
        }
    }
}

impl Default for LlmExecutorBuilder {
    fn default() -> Self {
        Self::new()
    }
}
