use tauri::State;
use crate::entity::novel_meta;
use crate::constants::{NovelMetaConstants, MetaPropertyDto};
use super::AppState;

#[tauri::command]
pub async fn create_meta(
    state: State<'_, AppState>,
    novel_id: i32,
    property_name: String,
    property_value: Option<String>,
) -> Result<novel_meta::Model, String> {
    state.meta().create(novel_id, property_name, property_value).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_meta(
    state: State<'_, AppState>,
    novel_id: i32,
) -> Result<Vec<novel_meta::Model>, String> {
    state.meta().find_by_novel(novel_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_meta(state: State<'_, AppState>, id: i32) -> Result<Option<novel_meta::Model>, String> {
    state.meta().find_by_id(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_meta_by_name(
    state: State<'_, AppState>,
    novel_id: i32,
    property_name: String,
) -> Result<Option<novel_meta::Model>, String> {
    state.meta().find_by_novel_and_name(novel_id, &property_name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_meta(
    state: State<'_, AppState>,
    id: i32,
    property_value: Option<String>,
) -> Result<novel_meta::Model, String> {
    state.meta().update(id, property_value).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn upsert_meta(
    state: State<'_, AppState>,
    novel_id: i32,
    property_name: String,
    property_value: Option<String>,
) -> Result<novel_meta::Model, String> {
    state.meta().upsert(novel_id, property_name, property_value).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_meta(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    state.meta().delete(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_novel_meta_properties() -> Vec<MetaPropertyDto> {
    NovelMetaConstants::get_all_properties()
}
