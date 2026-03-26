use crate::repository::NovelSettingsRepository;
use sea_orm::DatabaseConnection;
use serde_json::Value;
use std::sync::Arc;

pub async fn load_settings_context_from_input(
    db: &DatabaseConnection,
    input: &Value,
) -> anyhow::Result<Option<String>> {
    let novel_id = extract_novel_id(input);
    let Some(novel_id) = novel_id else {
        return Ok(None);
    };

    let repo = NovelSettingsRepository::new(Arc::new(db.clone()));
    repo.get_prompt_context(novel_id)
        .await
        .map_err(|e| anyhow::anyhow!(e.to_string()))
}

fn extract_novel_id(input: &Value) -> Option<i32> {
    input
        .get("novel_id")
        .and_then(|v| v.as_i64())
        .and_then(|v| i32::try_from(v).ok())
        .or_else(|| {
            input
                .get("novelId")
                .and_then(|v| v.as_i64())
                .and_then(|v| i32::try_from(v).ok())
        })
}
