//! Agent 运行时配置实体
//!
//! Agent 的静态名称、描述、类型、提示词等信息来自 `src/ai/prompts/*.toml`。
//! 数据库仅保存运行时绑定信息，例如绑定的 LLM 和额外配置。
//!
//! # Agent 代码常量
//!
//! - `novel_outline` - 小说大纲生成
//! - `chapter_timeline` - 时间线正文生成
//! - `character_design` - 角色设计
//! - `meta_generator` - 小说元数据生成
//! - `chapter_content` - 章节内容生成
//! - `chapter_polish` - 章节润色优化

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Agent 运行时配置实体
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "agent_config")]
pub struct Model {
    /// 自增主键
    #[sea_orm(primary_key)]
    pub id: i32,

    /// Agent 唯一标识码
    ///
    /// 用于路由到具体的 Agent 实现，如：
    /// - novel_outline: 小说大纲生成
    /// - chapter_timeline: 时间线正文生成
    /// - character_design: 角色设计
    /// - chapter_content: 章节内容生成
    /// - chapter_polish: 章节润色优化
    pub agent_code: String,

    /// 绑定的 LLM 配置 ID
    pub llm_config_id: Option<i32>,

    /// Agent 专属配置（JSON 格式）
    pub extra_config: Option<Json>,

    /// 创建时间
    pub created_at: String,

    /// 更新时间
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// Agent 代码常量
///
/// 定义系统中所有支持的 Agent 标识码
pub struct AgentCodes;

impl AgentCodes {
    pub const NOVEL_INFO_GENERATOR: &'static str = "novel_info_generator";
    pub const NOVEL_OUTLINE: &'static str = "novel_outline";
    pub const CHAPTER_TIMELINE: &'static str = "chapter_timeline";
    pub const CHARACTER_DESIGN: &'static str = "character_design";
    pub const META_GENERATOR: &'static str = "meta_generator";
    pub const CHAPTER_CONTENT: &'static str = "chapter_content";
}
