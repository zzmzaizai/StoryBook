use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 章节元数据实体
/// 
/// 存储章节的扩展属性，以键值对形式保存额外信息
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "novel_chapter_meta")]
pub struct Model {
    /// 主键ID
    #[sea_orm(primary_key)]
    pub id: i32,
    /// 所属章节ID
    pub chapter_id: i32,
    /// 属性名称
    pub property_name: String,
    /// 属性值
    pub property_value: Option<String>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
