use super::enums::NovelChapterStatus;
use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 小说章节实体
///
/// 存储小说的章节内容，包括章节号、标题、正文、字数统计等
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "chapters")]
pub struct Model {
    /// 主键ID
    #[sea_orm(primary_key)]
    pub id: i32,
    /// 所属小说ID
    pub novel_id: i32,
    /// 章节序号
    pub chapter_number: i32,
    /// 章节名称
    pub chapter_name: String,
    /// 章节正文内容
    pub content: Option<String>,
    /// 字数统计
    pub word_count: i32,
    /// 版本号
    pub version: i32,
    /// 章节状态（对应 NovelChapterStatus 枚举）
    pub status: i32,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

impl Model {
    /// 获取章节状态枚举值
    #[allow(dead_code)]
    pub fn get_status(&self) -> NovelChapterStatus {
        match self.status {
            0 => NovelChapterStatus::Draft,
            1 => NovelChapterStatus::Concept,
            2 => NovelChapterStatus::RoughDraft,
            3 => NovelChapterStatus::Final,
            7 => NovelChapterStatus::Revision,
            10 => NovelChapterStatus::Confirmed,
            44 => NovelChapterStatus::Abandoned,
            _ => NovelChapterStatus::Draft,
        }
    }
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
