use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use super::enums::{CharacterRoleAttribute, CharacterGender, CharacterType};

/// 小说角色实体
/// 
/// 存储小说中的角色信息，包括姓名、性格、属性等
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "characters")]
pub struct Model {
    /// 主键ID
    #[sea_orm(primary_key)]
    pub id: i32,
    /// 所属小说ID
    pub novel_id: i32,
    /// 角色名称
    pub name: String,
    /// 角色昵称
    pub nickname: Option<String>,
    /// 角色年龄
    pub age: Option<String>,
    /// 角色性格描述
    pub personality: Option<String>,
    /// 角色属性（对应 CharacterRoleAttribute 枚举）
    pub role_attribute: i32,
    /// 角色性别（对应 CharacterGender 枚举）
    pub gender: i32,
    /// 角色类型（对应 CharacterType 枚举）
    pub character_type: i32,
    /// 排序顺序
    pub sort_order: i32,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

impl Model {
    /// 获取角色属性枚举值
    pub fn get_role_attribute(&self) -> CharacterRoleAttribute {
        match self.role_attribute {
            1 => CharacterRoleAttribute::Protagonist,
            2 => CharacterRoleAttribute::Heroine,
            3 => CharacterRoleAttribute::Hero,
            4 => CharacterRoleAttribute::Villain,
            5 => CharacterRoleAttribute::Supporting,
            6 => CharacterRoleAttribute::Passerby,
            _ => CharacterRoleAttribute::Passerby,
        }
    }

    /// 获取角色性别枚举值
    pub fn get_gender(&self) -> CharacterGender {
        match self.gender {
            1 => CharacterGender::Male,
            2 => CharacterGender::Female,
            3 => CharacterGender::Neutral,
            _ => CharacterGender::Neutral,
        }
    }

    /// 获取角色类型枚举值
    pub fn get_character_type(&self) -> CharacterType {
        match self.character_type {
            1 => CharacterType::Human,
            2 => CharacterType::NonHuman,
            _ => CharacterType::Human,
        }
    }
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
