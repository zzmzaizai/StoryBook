//! Agent 服务层
//!
//! 提供 Agent 相关的业务逻辑

use crate::ai::agent::factory::AgentFactory;
use crate::entity::agent_config::AgentCodes;
use crate::ai::agent::traits::AgentResult;
use sea_orm::DatabaseConnection;

/// 小说大纲生成参数
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

/// 章节时间线生成参数
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChapterTimelineParams {
    pub outline: String,
    pub chapter_start: u32,
    pub chapter_end: u32,
    pub current_arc_goal: Option<String>,
}

/// 角色设计参数
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CharacterDesignParams {
    pub story_background: String,
    pub role_type: String,
    pub keywords: Vec<String>,
    pub relationship_hint: Option<String>,
}

/// 通用聊天参数
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GeneralChatParams {
    pub message: String,
    pub history: Option<Vec<crate::ai::agent::traits::ChatMessage>>,
    pub context: Option<String>,
}

/// Agent 业务服务
pub struct AgentBizService;

impl AgentBizService {
    pub async fn generate_novel_outline(
        db: &DatabaseConnection,
        params: NovelOutlineParams,
    ) -> anyhow::Result<AgentResult> {
        let input = serde_json::to_value(params)?;
        AgentFactory::new()
            .invoke(db, AgentCodes::NOVEL_OUTLINE, input)
            .await
    }

    pub async fn generate_chapter_timeline(
        db: &DatabaseConnection,
        params: ChapterTimelineParams,
    ) -> anyhow::Result<AgentResult> {
        let input = serde_json::to_value(params)?;
        AgentFactory::new()
            .invoke(db, AgentCodes::CHAPTER_TIMELINE, input)
            .await
    }

    pub async fn design_character(
        db: &DatabaseConnection,
        params: CharacterDesignParams,
    ) -> anyhow::Result<AgentResult> {
        let input = serde_json::to_value(params)?;
        AgentFactory::new()
            .invoke(db, AgentCodes::CHARACTER_DESIGN, input)
            .await
    }

    pub async fn general_chat(
        db: &DatabaseConnection,
        params: GeneralChatParams,
    ) -> anyhow::Result<AgentResult> {
        let input = serde_json::to_value(params)?;
        AgentFactory::new()
            .invoke(db, AgentCodes::GENERAL_CHAT, input)
            .await
    }
}
