//! Agent 服务层
//!
//! 对外提供统一的 Agent 调用入口

use crate::ai::agent::factory::AgentFactory;
use crate::ai::agent::traits::AgentResult;
use crate::ai::hooks::AiHookContext;
use crate::entity::agent_config::AgentCodes;
use rig::tool::ToolDyn;
use schemars::JsonSchema;
use sea_orm::DatabaseConnection;
use serde::{de::DeserializeOwned, Serialize};
use serde_json::Value;
use tokio::sync::mpsc::UnboundedSender;

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NovelOutlineParams {
    pub title: Option<String>,
    pub genre: String,
    pub theme: Option<String>,
    pub world_setting: String,
    pub core_conflict: String,
    pub style: Option<String>,
    pub target_length: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChapterTimelineParams {
    pub outline: String,
    pub chapter_start: u32,
    pub chapter_end: u32,
    pub current_arc_goal: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CharacterDesignParams {
    pub story_background: String,
    pub role_type: String,
    pub keywords: Vec<String>,
    pub relationship_hint: Option<String>,
}

pub struct AgentService;

impl AgentService {
    pub async fn invoke(
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        AgentFactory::new().invoke(db, agent_code, input).await
    }

    pub async fn invoke_structured_with_timeout<T>(
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        timeout_secs: Option<u64>,
        retries: u64,
    ) -> anyhow::Result<T>
    where
        T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
    {
        AgentFactory::new()
            .invoke_structured_with_timeout(db, agent_code, input, timeout_secs, retries)
            .await
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn invoke_structured_with_observation<T, F>(
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        timeout_secs: Option<u64>,
        retries: u64,
        max_turns: usize,
        build_tools: F,
        hook_context: AiHookContext,
    ) -> anyhow::Result<T>
    where
        T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
        F: Fn() -> Vec<Box<dyn ToolDyn>>,
    {
        AgentFactory::new()
            .invoke_structured_with_observation(
                db,
                agent_code,
                input,
                timeout_secs,
                retries,
                max_turns,
                build_tools,
                hook_context,
            )
            .await
    }

    pub async fn invoke_stream(
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<AgentResult> {
        AgentFactory::new()
            .invoke_stream(db, agent_code, input, tx)
            .await
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn invoke_stream_with_observation<F>(
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        timeout_secs: Option<u64>,
        retries: u64,
        max_turns: usize,
        build_tools: F,
        hook_context: AiHookContext,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<AgentResult>
    where
        F: Fn() -> Vec<Box<dyn ToolDyn>>,
    {
        AgentFactory::new()
            .invoke_stream_with_observation(
                db,
                agent_code,
                input,
                timeout_secs,
                retries,
                max_turns,
                build_tools,
                hook_context,
                tx,
            )
            .await
    }

    #[allow(dead_code)]
    pub async fn generate_novel_outline(
        db: &DatabaseConnection,
        params: NovelOutlineParams,
    ) -> anyhow::Result<AgentResult> {
        Self::invoke(db, AgentCodes::NOVEL_OUTLINE, serde_json::to_value(params)?).await
    }

    #[allow(dead_code)]
    pub async fn generate_chapter_timeline(
        db: &DatabaseConnection,
        params: ChapterTimelineParams,
    ) -> anyhow::Result<AgentResult> {
        Self::invoke(
            db,
            AgentCodes::CHAPTER_TIMELINE,
            serde_json::to_value(params)?,
        )
        .await
    }

    #[allow(dead_code)]
    pub async fn design_character(
        db: &DatabaseConnection,
        params: CharacterDesignParams,
    ) -> anyhow::Result<AgentResult> {
        Self::invoke(
            db,
            AgentCodes::CHARACTER_DESIGN,
            serde_json::to_value(params)?,
        )
        .await
    }
}
