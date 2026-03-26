//! LLM 执行器
//!
//! 负责执行 LLM 调用，管理对话流程

use crate::ai::llm::factory::{LlmClient, LlmFactory};
use crate::ai::llm::types::LlmCompletionParams;
use crate::entity::llm_config;
use tokio::sync::mpsc::UnboundedSender;

pub struct LlmExecutor {
    client: Box<dyn LlmClient>,
}

impl LlmExecutor {
    pub fn from_config(config: &llm_config::Model) -> anyhow::Result<Self> {
        let runtime_config = LlmFactory::create_runtime_config(config);
        let client = LlmFactory::create_rig_client(&runtime_config)?;
        Ok(Self { client })
    }

    pub async fn complete(&self, system_prompt: &str, user_prompt: &str) -> anyhow::Result<String> {
        let result = self
            .client
            .complete(LlmCompletionParams {
                system_prompt: system_prompt.to_string(),
                user_prompt: user_prompt.to_string(),
                ..Default::default()
            })
            .await?;

        Ok(result.content)
    }

    pub async fn stream_complete(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<String> {
        let result = self
            .client
            .stream_complete(
                LlmCompletionParams {
                    system_prompt: system_prompt.to_string(),
                    user_prompt: user_prompt.to_string(),
                    ..Default::default()
                },
                tx,
            )
            .await?;

        Ok(result.content)
    }
}
