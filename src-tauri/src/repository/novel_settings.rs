use chrono::Utc;
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use std::collections::HashMap;
use std::sync::Arc;

use crate::entity::novel_settings::{
    self, ActiveModel as ActiveNovelSetting, Entity as NovelSettings,
};

pub struct NovelSettingsRepository {
    db: Arc<DatabaseConnection>,
}

impl NovelSettingsRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn get_settings_map(
        &self,
        novel_id: i32,
    ) -> Result<HashMap<String, String>, sea_orm::DbErr> {
        let rows = NovelSettings::find()
            .filter(novel_settings::Column::NovelId.eq(novel_id))
            .all(&*self.db)
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|item| item.setting_value.map(|value| (item.setting_key, value)))
            .collect())
    }

    pub async fn get_prompt_context(
        &self,
        novel_id: i32,
    ) -> Result<Option<String>, sea_orm::DbErr> {
        let settings = self.get_settings_map(novel_id).await?;
        if settings.is_empty() {
            return Ok(None);
        }

        let ordered = [
            ("perspective", "叙事视角"),
            ("language_style", "语言风格"),
            ("pacing", "节奏风格"),
            ("structure_complexity", "结构复杂度"),
            ("tone", "情绪基调"),
            ("core_conflict_type", "核心冲突类型"),
            ("reader_expectation", "读者预期"),
            ("relationship_focus", "角色关系重心"),
            ("theme", "主题思想"),
            ("conflict", "核心冲突"),
        ];

        let lines: Vec<String> = ordered
            .into_iter()
            .filter_map(|(key, label)| {
                settings
                    .get(key)
                    .filter(|v| !v.trim().is_empty())
                    .map(|v| format!("- {}：{}", label, v.trim()))
            })
            .collect();

        if lines.is_empty() {
            Ok(None)
        } else {
            Ok(Some(format!(
                "当前小说写作设置如下，请在回答时尽量保持一致：\n{}",
                lines.join("\n")
            )))
        }
    }

    pub async fn upsert_many(
        &self,
        novel_id: i32,
        settings: HashMap<String, String>,
    ) -> Result<(), sea_orm::DbErr> {
        for (key, value) in settings {
            self.upsert_setting(novel_id, &key, Some(value)).await?;
        }

        Ok(())
    }

    pub async fn upsert_setting(
        &self,
        novel_id: i32,
        key: &str,
        value: Option<String>,
    ) -> Result<(), sea_orm::DbErr> {
        let now = Utc::now().to_rfc3339();

        let existing = NovelSettings::find()
            .filter(novel_settings::Column::NovelId.eq(novel_id))
            .filter(novel_settings::Column::SettingKey.eq(key))
            .one(&*self.db)
            .await?;

        match existing {
            Some(model) => {
                let mut active: ActiveNovelSetting = model.into();
                active.setting_value = Set(value);
                active.updated_at = Set(now);
                active.update(&*self.db).await?;
            }
            None => {
                let model = ActiveNovelSetting {
                    novel_id: Set(novel_id),
                    setting_key: Set(key.to_string()),
                    setting_value: Set(value),
                    created_at: Set(now.clone()),
                    updated_at: Set(now),
                    ..Default::default()
                };
                model.insert(&*self.db).await?;
            }
        }

        Ok(())
    }
}
