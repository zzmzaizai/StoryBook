//! Agent 工厂类
//!
//! 统一创建和管理 Agent 实例

use crate::ai::agent::registry::AgentRegistry;
use crate::ai::agent::traits::{AgentContext, AgentExecutionContext, AgentHandler, AgentResult};
use crate::ai::llm::service::LlmService;
use crate::entity::agent_config;
use crate::repository::AgentConfigRepository;
use sea_orm::DatabaseConnection;
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::mpsc::UnboundedSender;

pub struct AgentFactory {
    registry: AgentRegistry,
}

const NOVEL_INFO_GENERATOR_JSON_GUARD: &str = r#"你必须只返回一个合法 JSON 对象，并满足以下要求：
- 不要输出 markdown 代码块
- 不要输出解释说明、前言、后记
- 不要输出 JSON 之外的任何文字
- 所有字段必须使用双引号包裹的标准 JSON
- 字段必须包含：title, description, style, target_audience, length_type, estimated_chapter_count, estimated_total_word_count, estimated_words_per_chapter, protagonist_name, protagonist_description, core_conflict, world_setting"#;

impl AgentFactory {
    pub fn new() -> Self {
        Self {
            registry: AgentRegistry::new(),
        }
    }

    pub async fn invoke(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        self.invoke_with_timeout(db, agent_code, input, None).await
    }

    pub async fn invoke_with_timeout(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        timeout_secs: Option<u64>,
    ) -> anyhow::Result<AgentResult> {
        let settings_context =
            crate::ai::agent::settings_context::load_settings_context_from_input(db, &input)
                .await?;
        let agent_config = self.load_agent_config(db, agent_code).await?;
        let llm_config = LlmService::get_llm_for_agent(db, agent_config.llm_config_id).await?;
        let handler = self.get_required_handler(agent_code)?;
        let exec_ctx = self
            .build_exec_ctx(agent_code, &agent_config, settings_context)
            .await?;
        let ctx = AgentContext::new(input);
        let content = handler
            .execute_with_timeout(&llm_config, exec_ctx, ctx, timeout_secs)
            .await?;

        Ok(AgentResult {
            content,
            llm_config_id: llm_config.id,
            provider: llm_config.provider.clone(),
            model: llm_config.model.clone(),
        })
    }

    pub async fn invoke_with_llm(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        llm_config_id: i32,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        let settings_context =
            crate::ai::agent::settings_context::load_settings_context_from_input(db, &input)
                .await?;
        let agent_config = self.load_agent_config(db, agent_code).await?;
        let llm_config = LlmService::get_llm_by_id(db, llm_config_id).await?;
        let handler = self.get_required_handler(agent_code)?;
        let exec_ctx = self
            .build_exec_ctx(agent_code, &agent_config, settings_context)
            .await?;
        let ctx = AgentContext::new(input);
        let content = handler.execute(&llm_config, exec_ctx, ctx).await?;

        Ok(AgentResult {
            content,
            llm_config_id: llm_config.id,
            provider: llm_config.provider.clone(),
            model: llm_config.model.clone(),
        })
    }

    pub async fn invoke_stream(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<AgentResult> {
        let settings_context =
            crate::ai::agent::settings_context::load_settings_context_from_input(db, &input)
                .await?;
        let agent_config = self.load_agent_config(db, agent_code).await?;
        let llm_config = LlmService::get_llm_for_agent(db, agent_config.llm_config_id).await?;
        let handler = self.get_required_handler(agent_code)?;
        let exec_ctx = self
            .build_exec_ctx(agent_code, &agent_config, settings_context)
            .await?;
        let ctx = AgentContext::new(input);
        let content = handler
            .execute_stream(&llm_config, exec_ctx, ctx, tx)
            .await?;

        Ok(AgentResult {
            content,
            llm_config_id: llm_config.id,
            provider: llm_config.provider.clone(),
            model: llm_config.model.clone(),
        })
    }

    async fn build_exec_ctx(
        &self,
        agent_code: &str,
        agent_config: &agent_config::Model,
        settings_context: Option<String>,
    ) -> anyhow::Result<AgentExecutionContext> {
        let system_prompt = if agent_config.use_system_prompt {
            crate::ai::prompts::load_prompt(agent_code).await?
        } else {
            String::new()
        };

        let system_prompt = if agent_code == agent_config::AgentCodes::NOVEL_INFO_GENERATOR {
            if system_prompt.trim().is_empty() {
                NOVEL_INFO_GENERATOR_JSON_GUARD.to_string()
            } else {
                format!(
                    "{}\n\n{}",
                    system_prompt.trim(),
                    NOVEL_INFO_GENERATOR_JSON_GUARD
                )
            }
        } else {
            system_prompt
        };

        let system_prompt = if let Some(settings_context) = settings_context {
            if system_prompt.trim().is_empty() {
                settings_context
            } else {
                format!("{}\n\n{}", system_prompt.trim(), settings_context)
            }
        } else {
            system_prompt
        };

        Ok(AgentExecutionContext {
            system_prompt,
            custom_prompt: agent_config.custom_prompt.clone(),
            extra_params: agent_config.extra_config.clone(),
        })
    }

    async fn load_agent_config(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
    ) -> anyhow::Result<agent_config::Model> {
        let repo = AgentConfigRepository::new(Arc::new(db.clone()));
        repo.find_by_agent_code(agent_code)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Agent 配置不存在: {}", agent_code))
    }

    fn get_required_handler(&self, agent_code: &str) -> anyhow::Result<Arc<dyn AgentHandler>> {
        self.registry
            .get(agent_code)
            .ok_or_else(|| anyhow::anyhow!("未找到 Agent: {}", agent_code))
    }
}

impl Default for AgentFactory {
    fn default() -> Self {
        Self::new()
    }
}
