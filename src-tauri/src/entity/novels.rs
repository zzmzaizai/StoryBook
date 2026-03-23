use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};
use super::enums::{NovelStyle, NovelStatus, NovelLengthType, TargetAudience};

/// 小说实体
/// 
/// 存储小说的基本信息，包括标题、描述、风格、状态等
#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "novels")]
pub struct Model {
    /// 主键ID
    #[sea_orm(primary_key)]
    pub id: i32,
    /// 小说标题
    pub title: String,
    /// 小说描述/简介
    pub description: Option<String>,
    /// 小说封面图片
    pub image: Option<String>,
    /// 原始描述（AI生成前的原始内容）
    pub original_description: Option<String>,
    /// 小说风格（对应 NovelStyle 枚举）
    pub style: i32,
    /// 目标读者群体（对应 TargetAudience 枚举）
    pub target_audience: i32,
    /// 篇幅长度类型（对应 NovelLengthType 枚举）
    pub length_type: i32,
    /// 是否重点关注
    pub is_focus: bool,
    /// 预估章节数量
    pub estimated_chapter_count: Option<i32>,
    /// 预估总字数
    pub estimated_total_word_count: Option<i64>,
    /// 每章预估字数
    pub estimated_words_per_chapter: Option<i32>,
    /// 实际总字数
    pub total_word_count: i64,
    /// 小说状态（对应 NovelStatus 枚举）
    pub status: i32,
    /// 创建时间
    pub created_at: String,
    /// 更新时间
    pub updated_at: String,
}

impl Model {
    /// 获取小说风格枚举值
    pub fn get_style(&self) -> NovelStyle {
        match self.style {
            1 => NovelStyle::Urban,
            2 => NovelStyle::Fantasy,
            3 => NovelStyle::Suspense,
            4 => NovelStyle::Comedy,
            5 => NovelStyle::Romance,
            6 => NovelStyle::Horror,
            7 => NovelStyle::Scifi,
            8 => NovelStyle::Historical,
            9 => NovelStyle::Wuxia,
            10 => NovelStyle::Xianxia,
            _ => NovelStyle::Urban,
        }
    }

    /// 获取小说状态枚举值
    pub fn get_status(&self) -> NovelStatus {
        match self.status {
            1 => NovelStatus::Concept,
            2 => NovelStatus::InProgress,
            3 => NovelStatus::Completed,
            4 => NovelStatus::Abandoned,
            _ => NovelStatus::Concept,
        }
    }

    /// 获取篇幅长度类型枚举值
    pub fn get_length_type(&self) -> NovelLengthType {
        match self.length_type {
            1 => NovelLengthType::SuperLong,
            2 => NovelLengthType::Long,
            3 => NovelLengthType::Medium,
            4 => NovelLengthType::Short,
            5 => NovelLengthType::Other,
            _ => NovelLengthType::Medium,
        }
    }

    /// 获取目标读者群体枚举值
    pub fn get_target_audience(&self) -> TargetAudience {
        match self.target_audience {
            1 => TargetAudience::Male,
            2 => TargetAudience::Female,
            3 => TargetAudience::Children,
            4 => TargetAudience::All,
            _ => TargetAudience::All,
        }
    }
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
