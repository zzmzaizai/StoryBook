use std::collections::HashMap;

use tauri::State;

use super::AppState;

#[tauri::command]
pub async fn get_novel_settings(
    state: State<'_, AppState>,
    novel_id: i32,
) -> Result<HashMap<String, String>, String> {
    state
        .novel_settings()
        .get_settings_map(novel_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_novel_settings(
    state: State<'_, AppState>,
    novel_id: i32,
    settings: HashMap<String, String>,
) -> Result<(), String> {
    state
        .novel_settings()
        .upsert_many(novel_id, settings)
        .await
        .map_err(|e| e.to_string())
}
