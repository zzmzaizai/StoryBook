//! Agent 服务层
//!
//! 对外提供统一的 Agent 调用入口

use crate::ai::agent::factory::AgentFactory;
use crate::ai::agent::traits::AgentResult;
use crate::entity::agent_config::AgentCodes;
use sea_orm::DatabaseConnection;
use serde_json::Value;
use tokio::sync::mpsc::UnboundedSender;

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

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChapterTimelineParams {
    pub outline: String,
    pub chapter_start: u32,
    pub chapter_end: u32,
    pub current_arc_goal: Option<String>,
}

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

    pub async fn invoke_with_llm(
        db: &DatabaseConnection,
        agent_code: &str,
        llm_config_id: i32,
        input: Value,
    ) -> anyhow::Result<AgentResult> {
        AgentFactory::new()
            .invoke_with_llm(db, agent_code, llm_config_id, input)
            .await
    }

    pub async fn invoke_stream(
        db: &DatabaseConnection,
        agent_code: &str,
        input: Value,
        tx: UnboundedSender<String>,
    ) -> anyhow::Result<AgentResult> {
        AgentFactory::new().invoke_stream(db, agent_code, input, tx).await
    }

    pub async fn generate_novel_outline(
        db: &DatabaseConnection,
        params: NovelOutlineParams,
    ) -> anyhow::Result<AgentResult> {
        Self::invoke(db, AgentCodes::NOVEL_OUTLINE, serde_json::to_value(params)?).await
    }

    pub async fn generate_chapter_timeline(
        db: &DatabaseConnection,
        params: ChapterTimelineParams,
    ) -> anyhow::Result<AgentResult> {
        Self::invoke(db, AgentCodes::CHAPTER_TIMELINE, serde_json::to_value(params)?).await
    }

    pub async fn design_character(
        db: &DatabaseConnection,
        params: CharacterDesignParams,
    ) -> anyhow::Result<AgentResult> {
        Self::invoke(db, AgentCodes::CHARACTER_DESIGN, serde_json::to_value(params)?).await
    }
}
