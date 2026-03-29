//! Agent 配置实体
//!
//! 存储 AI Agent 的配置信息，支持绑定指定 LLM 或使用默认 LLM。
//!
//! # 字段说明
//!
//! | 字段 | 类型 | 说明 |
//! |------|------|------|
//! | id | i32 | 自增主键 |
//! | agent_code | String | 唯一标识码，如 novel_outline / chapter_timeline |
//! | name | String | 显示名称 |
//! | description | Option<String> | 描述信息 |
//! | llm_config_id | Option<i32> | 绑定的 LLM 配置 ID，为空则使用默认 LLM |
//! | custom_prompt | Option<String> | 用户自定义提示词 |
//! | use_system_prompt | bool | 是否使用系统提示词 |
//! | enabled | bool | 是否启用 |
//! | extra_config | Option<Json> | Agent 专属配置 |
//!
//! # Agent 代码常量
//!
//! - `novel_outline` - 小说大纲生成
//! - `chapter_timeline` - 章节时间线规划
//! - `character_design` - 角色设计
//! - `meta_generator` - 小说元数据生成
//! - `chapter_content` - 章节内容生成
//! - `chapter_polish` - 章节润色优化

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// Agent 配置实体
///
/// 用于存储 AI Agent 的配置信息，支持自定义提示词和 LLM 绑定。
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
    /// - chapter_timeline: 章节时间线规划
    /// - character_design: 角色设计
    /// - chapter_content: 章节内容生成
    /// - chapter_polish: 章节润色优化
    pub agent_code: String,

    /// 显示名称
    pub name: String,

    /// 描述信息
    pub description: Option<String>,

    /// 绑定的 LLM 配置 ID
    ///
    /// 如果为 None，则使用默认 LLM 配置
    pub llm_config_id: Option<i32>,

    /// 用户自定义提示词
    ///
    /// 可以覆盖或追加到系统默认提示词
    pub custom_prompt: Option<String>,

    /// 是否使用系统提示词
    ///
    /// - true: 使用系统内置提示词
    /// - false: 使用 custom_prompt
    pub use_system_prompt: bool,

    /// 是否启用
    pub enabled: bool,

    /// Agent 专属配置（JSON 格式）
    ///
    /// 可包含：
    /// - output_language: 输出语言
    /// - style: 输出风格
    /// - temperature: 温度偏好
    /// - json_output: 是否 JSON 输出
    /// - max_words: 最大输出字数
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
    pub const GENERAL_CHAT: &'static str = "general_chat";
    pub const NOVEL_INFO_GENERATOR: &'static str = "novel_info_generator";
    pub const NOVEL_OUTLINE: &'static str = "novel_outline";
    pub const CHAPTER_TIMELINE: &'static str = "chapter_timeline";
    pub const CHARACTER_DESIGN: &'static str = "character_design";
    pub const META_GENERATOR: &'static str = "meta_generator";
    pub const CHAPTER_CONTENT: &'static str = "chapter_content";
    pub const CHAPTER_POLISH: &'static str = "chapter_polish";

    pub fn all() -> Vec<&'static str> {
        vec![
            Self::GENERAL_CHAT,
            Self::NOVEL_INFO_GENERATOR,
            Self::NOVEL_OUTLINE,
            Self::CHAPTER_TIMELINE,
            Self::CHARACTER_DESIGN,
            Self::META_GENERATOR,
            Self::CHAPTER_CONTENT,
            Self::CHAPTER_POLISH,
        ]
    }

    pub fn get_default_name(code: &str) -> &'static str {
        match code {
            Self::GENERAL_CHAT => "通用助手",
            Self::NOVEL_INFO_GENERATOR => "小说基础信息生成",
            Self::NOVEL_OUTLINE => "小说大纲生成",
            Self::CHAPTER_TIMELINE => "章节时间线规划",
            Self::CHARACTER_DESIGN => "角色设计",
            Self::META_GENERATOR => "小说元数据生成",
            Self::CHAPTER_CONTENT => "章节内容生成",
            Self::CHAPTER_POLISH => "章节润色优化",
            _ => "未知 Agent",
        }
    }

    pub fn get_default_description(code: &str) -> &'static str {
        match code {
            Self::GENERAL_CHAT => "用于通用聊天问答与小说相关咨询。",
            Self::NOVEL_INFO_GENERATOR => "根据用户要求生成小说基础信息 JSON。",
            Self::NOVEL_OUTLINE => "根据故事概念生成整体大纲与章节规划。",
            Self::CHAPTER_TIMELINE => "结合上下文生成或改写章节时间线与卷级规划。",
            Self::CHARACTER_DESIGN => "结合设定生成或改写角色档案与性格描述。",
            Self::META_GENERATOR => "结合小说设定生成或改写单项小说元数据。",
            Self::CHAPTER_CONTENT => "结合时间线和上下文生成、扩写、续写章节正文。",
            Self::CHAPTER_POLISH => "对现有章节进行润色、重写或风格优化。",
            _ => "未知 Agent。",
        }
    }

    pub fn is_builtin(code: &str) -> bool {
        Self::all().contains(&code)
    }
}
