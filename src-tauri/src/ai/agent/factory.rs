//! Agent 工厂类
//!
//! 统一创建和管理 Agent 实例

use crate::ai::agent::registry::AgentRegistry;
use crate::entity::agent_config::AgentCodes;
use crate::ai::agent::traits::{AgentContext, AgentExecutionContext, AgentHandler, AgentResult};
use crate::ai::llm::service::LlmService;
use crate::entity::agent_config;
use sea_orm::{ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter};
use serde_json::Value;
use tokio::sync::mpsc::UnboundedSender;

/// Agent 工厂类
///
/// 负责创建 Agent 实例并执行调用
pub struct AgentFactory {
    registry: AgentRegistry,
}

impl AgentFactory {
    /// 创建新的 Agent 工厂
    pub fn new() -> Self {
        Self {
            registry: AgentRegistry::new(),
        }
    }

    /// 创建 Agent 并执行
    ///
    /// # 参数
    /// - `db`: 数据库连接
    /// - `agent_code`: Agent 代码
    /// - `input`: 输入参数
    ///
    /// # 返回
    /// Agent 执行结果
    pub async fn invoke(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        // 获取 Agent 配置
        let agent_config = self.load_agent_config(db, agent_code).await?;

        // 获取 LLM 配置
        let llm_config = LlmService::get_llm_for_agent(db, agent_config.llm_config_id).await?;

        // 获取 Agent Handler
        let handler = self
            .registry
            .get(agent_code)
            .ok_or_else(|| anyhow::anyhow!("未找到 Agent: {}", agent_code))?;

        // 加载系统提示词
        let system_prompt = if agent_config.use_system_prompt {
            crate::ai::prompts::load_prompt(agent_code).await?
        } else {
            String::new()
        };

        // 构建执行上下文
        let exec_ctx = AgentExecutionContext {
            system_prompt,
            custom_prompt: agent_config.custom_prompt.clone(),
            extra_params: agent_config.extra_config.clone(),
        };

        // 构建 Agent 上下文
        let ctx = AgentContext::new(input);

        // 执行 Agent
        let content = handler.execute(&llm_config, exec_ctx, ctx).await?;

        Ok(AgentResult {
            content,
            llm_config_id: llm_config.id,
            provider: llm_config.provider.clone(),
            model: llm_config.model.clone(),
        })
    }

    /// 使用指定 LLM 执行 Agent
    ///
    /// 绕过数据库中的 LLM 绑定，直接使用指定的 LLM 配置
    pub async fn invoke_with_llm(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        llm_config_id: i32,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        // 获取 Agent 配置（仅用于提示词设置）
        let agent_config = self.load_agent_config(db, agent_code).await?;

        // 获取指定的 LLM 配置
        let llm_config = LlmService::get_llm_by_id(db, llm_config_id).await?;

        // 获取 Agent Handler
        let handler = self
            .registry
            .get(agent_code)
            .ok_or_else(|| anyhow::anyhow!("未找到 Agent: {}", agent_code))?;

        // 加载系统提示词
        let system_prompt = if agent_config.use_system_prompt {
            crate::ai::prompts::load_prompt(agent_code).await?
        } else {
            String::new()
        };

        // 构建执行上下文
        let exec_ctx = AgentExecutionContext {
            system_prompt,
            custom_prompt: agent_config.custom_prompt.clone(),
            extra_params: agent_config.extra_config.clone(),
        };

        // 构建 Agent 上下文
        let ctx = AgentContext::new(input);

        // 执行 Agent
        let content = handler.execute(&llm_config, exec_ctx, ctx).await?;

        Ok(AgentResult {
            content,
            llm_config_id: llm_config.id,
            provider: llm_config.provider.clone(),
            model: llm_config.model.clone(),
        })
    }

    /// 流式执行 Agent
    pub async fn invoke_stream(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<AgentResult> {
        let agent_config = self.load_agent_config(db, agent_code).await?;
        let llm_config = LlmService::get_llm_for_agent(db, agent_config.llm_config_id).await?;

        let handler = self
            .registry
            .get(agent_code)
            .ok_or_else(|| anyhow::anyhow!("未找到 Agent: {}", agent_code))?;

        let system_prompt = if agent_config.use_system_prompt {
            crate::ai::prompts::load_prompt(agent_code).await?
        } else {
            String::new()
        };

        let exec_ctx = AgentExecutionContext {
            system_prompt,
            custom_prompt: agent_config.custom_prompt.clone(),
            extra_params: agent_config.extra_config.clone(),
        };

        let ctx = AgentContext::new(input);
        let content = handler.execute_stream(&llm_config, exec_ctx, ctx, tx).await?;

        Ok(AgentResult {
            content,
            llm_config_id: llm_config.id,
            provider: llm_config.provider.clone(),
            model: llm_config.model.clone(),
        })
    }

    /// 加载 Agent 配置
    async fn load_agent_config(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
    ) -> anyhow::Result<agent_config::Model> {
        let config = agent_config::Entity::find()
            .filter(agent_config::Column::AgentCode.eq(agent_code))
            .filter(agent_config::Column::Enabled.eq(true))
            .one(db)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Agent 配置不存在或已禁用: {}", agent_code))?;

        Ok(config)
    }

    /// 获取 Agent Handler
    pub fn get_handler(&self, agent_code: &str) -> Option<Arc<dyn AgentHandler>> {
        self.registry.get(agent_code)
    }

    /// 检查 Agent 是否存在
    pub fn has_agent(&self, agent_code: &str) -> bool {
        self.registry.has(agent_code)
    }

    /// 获取所有可用的 Agent 代码
    pub fn list_agents(&self) -> Vec<String> {
        self.registry.list_codes()
    }
}

impl Default for AgentFactory {
    fn default() -> Self {
        Self::new()
    }
}

use std::sync::Arc;

/// Agent 服务
///
/// 提供 Agent 调用的静态方法
pub struct AgentService;

impl AgentService {
    /// 调用 Agent
    ///
    /// 便捷方法，无需手动创建工厂实例
    pub async fn invoke(
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        let factory = AgentFactory::new();
        factory.invoke(db, agent_code, input).await
    }

    /// 使用指定 LLM 调用 Agent
    pub async fn invoke_with_llm(
        db: &DatabaseConnection,
        agent_code: &str,
        llm_config_id: i32,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        let factory = AgentFactory::new();
        factory.invoke_with_llm(db, agent_code, llm_config_id, input).await
    }

    pub async fn invoke_stream(
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<AgentResult> {
        let factory = AgentFactory::new();
        factory.invoke_stream(db, agent_code, input, tx).await
    }
}
