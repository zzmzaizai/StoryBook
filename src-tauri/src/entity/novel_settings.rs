use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 小说设置实体
/// 
/// 存储小说的相关设置项，以键值对形式保存配置
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "novel_settings")]
pub struct Model {
    /// 主键ID
    #[sea_orm(primary_key)]
    pub id: i32,
    /// 所属小说ID
    pub novel_id: i32,
    /// 设置键名
    pub setting_key: String,
    /// 设置值
    pub setting_value: Option<String>,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
