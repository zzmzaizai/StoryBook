#![allow(dead_code)]

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 章节历史记录实体
///
/// 存储章节的历史版本，用于版本回溯和对比
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "novel_chapter_history")]
pub struct Model {
    /// 主键ID
    #[sea_orm(primary_key)]
    pub id: i32,
    /// 所属小说ID
    pub novel_id: i32,
    /// 所属章节ID
    pub chapter_id: i32,
    /// 章节序号
    pub chapter_number: i32,
    /// 章节名称
    pub chapter_name: String,
    /// 章节内容
    pub content: Option<String>,
    /// 字数统计
    pub word_count: i32,
    /// 版本号
    pub version: i32,
    /// 章节状态
    pub status: i32,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
