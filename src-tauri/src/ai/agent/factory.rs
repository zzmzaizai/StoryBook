//! Agent 工厂类
//!
//! 统一创建和管理 Agent 实例

use crate::ai::agent::registry::AgentRegistry;
use crate::ai::agent::traits::{AgentContext, AgentExecutionContext, AgentHandler, AgentResult};
use crate::ai::llm::service::LlmService;
use crate::ai::prompts::{load_prompt_config, merge_additional_params, PromptConfig};
use crate::entity::agent_config;
use crate::repository::AgentConfigRepository;
use schemars::JsonSchema;
use sea_orm::DatabaseConnection;
use serde::{de::DeserializeOwned, Serialize};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::mpsc::UnboundedSender;

pub struct AgentFactory {
    registry: AgentRegistry,
}

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

    pub async fn invoke_structured_with_timeout<T>(
        &self,
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        timeout_secs: Option<u64>,
        retries: u64,
    ) -> anyhow::Result<T>
    where
        T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
    {
        use crate::ai::llm::executor::LlmStructuredExecutor;

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
        let user_prompt = handler.resolve_user_prompt(&exec_ctx, &ctx).await?;
        let system_prompt = exec_ctx.resolve_prompt();
        let executor = LlmStructuredExecutor::from_config(&llm_config)?;

        executor
            .extract_with_timeout(
                &system_prompt,
                &user_prompt,
                timeout_secs,
                retries,
                exec_ctx.extra_params.clone(),
            )
            .await
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
        let prompt_config = if agent_config.use_system_prompt {
            load_prompt_config(agent_code).await?
        } else {
            PromptConfig {
                system_prompt: String::new(),
                user_template: None,
                output_format: None,
                extra: Default::default(),
            }
        };

        let system_prompt = prompt_config.render_system_prompt();

        let system_prompt = if let Some(settings_context) = settings_context {
            if system_prompt.trim().is_empty() {
                settings_context
            } else {
                format!("{}\n\n{}", system_prompt.trim(), settings_context)
            }
        } else {
            system_prompt
        };

        let extra_params = merge_additional_params(
            prompt_config.extra.additional_params_value(),
            agent_config.extra_config.clone(),
        );

        Ok(AgentExecutionContext {
            system_prompt,
            custom_prompt: agent_config.custom_prompt.clone(),
            prompt_config,
            extra_params,
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
