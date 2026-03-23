use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 章节版本实体
/// 
/// 存储章节的不同版本，支持AI辅助修改建议
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "novel_chapter_version")]
pub struct Model {
    /// 主键ID
    #[sea_orm(primary_key)]
    pub id: i32,
    /// 所属章节ID
    pub chapter_id: i32,
    /// 版本号
    pub version: i32,
    /// 元属性名称（修改的属性类型）
    pub meta_property_name: String,
    /// 修改建议（AI生成的修改建议）
    pub modification_suggestion: Option<String>,
    /// 章节名称
    pub chapter_name: String,
    /// 章节内容
    pub content: Option<String>,
    /// 是否激活使用中
    pub is_activated: bool,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
