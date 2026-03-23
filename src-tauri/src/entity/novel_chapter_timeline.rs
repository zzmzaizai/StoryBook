use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 章节时间线实体
/// 
/// 存储小说剧情时间线，用于规划章节发展
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "novel_chapter_timeline")]
pub struct Model {
    /// 主键ID
    #[sea_orm(primary_key)]
    pub id: i32,
    /// 所属小说ID
    pub novel_id: i32,
    /// 时间线标题
    pub title: String,
    /// 时间线描述
    pub description: Option<String>,
    /// 时间线大纲
    pub timeline_outline: Option<String>,
    /// 起始章节号
    pub start_chapter_number: Option<i32>,
    /// 结束章节号
    pub end_chapter_number: Option<i32>,
    /// 涉及角色描述
    pub characters_description: Option<String>,
    /// 章节元数据（JSON格式）
    pub chapter_metas: Option<String>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
