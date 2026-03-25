//! Agent 工厂类
//!
//! 统一创建和管理 Agent 实例，所有配置查询通过 Repository 层实现

use crate::ai::agent::registry::AgentRegistry;
use crate::ai::agent::traits::{AgentContext, AgentExecutionContext, AgentHandler, AgentResult};
use crate::ai::llm::service::LlmService;
use crate::entity::agent_config;
use crate::repository::AgentConfigRepository;
use sea_orm::DatabaseConnection;
use serde_json::Value;
use std::sync::Arc;

/// Agent 工厂类
pub struct AgentFactory {
    registry: AgentRegistry,
}

impl AgentFactory {
    pub fn new() -> Self {
        Self {
            registry: AgentRegistry::new(),
        }
    }

    fn get_repository(db: &DatabaseConnection) -> AgentConfigRepository {
        AgentConfigRepository::new(Arc::new(db.clone()))
    }

    pub async fn invoke(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        let agent_config = Self::load_agent_config(db, agent_code).await?;
        let llm_config = LlmService::get_llm_for_agent(db, agent_config.llm_config_id).await?;

        let handler = self
            .registry
            .get(agent_code)
            .ok_or_else(|| anyhow::anyhow!("Agent not found: {}", agent_code))?;

        let system_prompt = if agent_config.use_system_prompt {
            crate::ai::prompts::load_prompt(agent_code).await?
        } else {
            String::new()
        };

        let mut exec_ctx = AgentExecutionContext::new(system_prompt);

        if let Some(ref custom) = agent_config.custom_prompt {
            exec_ctx = exec_ctx.with_custom_prompt(custom);
        }

        let ctx = AgentContext::new(input);

        let content = handler.execute(&llm_config, exec_ctx, ctx).await?;

        Ok(AgentResult::new(
            content,
            llm_config.id,
            &llm_config.provider,
            &llm_config.model,
        ))
    }

    pub async fn invoke_with_llm(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        llm_config_id: i32,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        let agent_config = Self::load_agent_config(db, agent_code).await?;
        let llm_config = LlmService::get_llm_by_id(db, llm_config_id).await?;

        let handler = self
            .registry
            .get(agent_code)
            .ok_or_else(|| anyhow::anyhow!("Agent not found: {}", agent_code))?;

        let system_prompt = if agent_config.use_system_prompt {
            crate::ai::prompts::load_prompt(agent_code).await?
        } else {
            String::new()
        };

        let mut exec_ctx = AgentExecutionContext::new(system_prompt);

        if let Some(ref custom) = agent_config.custom_prompt {
            exec_ctx = exec_ctx.with_custom_prompt(custom);
        }

        let ctx = AgentContext::new(input);

        let content = handler.execute(&llm_config, exec_ctx, ctx).await?;

        Ok(AgentResult::new(
            content,
            llm_config.id,
            &llm_config.provider,
            &llm_config.model,
        ))
    }

    async fn load_agent_config(
        db: &DatabaseConnection,
        agent_code: &str,
    ) -> anyhow::Result<agent_config::Model> {
        let repo = Self::get_repository(db);
        repo.find_by_agent_code(agent_code)
            .await?
            .filter(|c| c.enabled)
            .ok_or_else(|| anyhow::anyhow!("Agent config not found or disabled: {}", agent_code))
    }

    pub fn get_handler(&self, agent_code: &str) -> Option<Arc<dyn AgentHandler>> {
        self.registry.get(agent_code)
    }

    pub fn has_agent(&self, agent_code: &str) -> bool {
        self.registry.has(agent_code)
    }

    pub fn list_agents(&self) -> Vec<String> {
        self.registry.list_codes()
    }
}

impl Default for AgentFactory {
    fn default() -> Self {
        Self::new()
    }
}

/// Agent 服务
pub struct AgentService;

impl AgentService {
    pub async fn invoke(
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        let factory = AgentFactory::new();
        factory.invoke(db, agent_code, input).await
    }

    pub async fn invoke_with_llm(
        db: &DatabaseConnection,
        agent_code: &str,
        llm_config_id: i32,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        let factory = AgentFactory::new();
        factory.invoke_with_llm(db, agent_code, llm_config_id, input).await
    }

    pub fn get_handler(agent_code: &str) -> Option<Arc<dyn AgentHandler>> {
        let factory = AgentFactory::new();
        factory.get_handler(agent_code)
    }

    pub async fn get_agent_config(
        db: &DatabaseConnection,
        agent_code: &str,
    ) -> anyhow::Result<agent_config::Model> {
        AgentFactory::load_agent_config(db, agent_code).await
    }
}