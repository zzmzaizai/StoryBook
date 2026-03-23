use tauri::State;
use crate::entity::novel_chapter_timeline;
use crate::repository::TimelineUpdateParams;
use crate::constants::{ChapterMetaConstants, MetaPropertyDto};
use super::AppState;

#[tauri::command]
pub async fn create_timeline(
    state: State<'_, AppState>,
    novel_id: i32,
    title: String,
) -> Result<novel_chapter_timeline::Model, String> {
    state.timelines().create(novel_id, title).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_timelines(
    state: State<'_, AppState>,
    novel_id: i32,
) -> Result<Vec<novel_chapter_timeline::Model>, String> {
    state.timelines().find_by_novel(novel_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_timeline(state: State<'_, AppState>, id: i32) -> Result<Option<novel_chapter_timeline::Model>, String> {
    state.timelines().find_by_id(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_timeline(
    state: State<'_, AppState>,
    id: i32,
    title: Option<String>,
    description: Option<String>,
    timeline_outline: Option<String>,
    start_chapter_number: Option<i32>,
    end_chapter_number: Option<i32>,
    characters_description: Option<String>,
    chapter_metas: Option<String>,
) -> Result<novel_chapter_timeline::Model, String> {
    let params = TimelineUpdateParams {
        title,
        description,
        timeline_outline,
        start_chapter_number,
        end_chapter_number,
        characters_description,
        chapter_metas,
    };
    state.timelines().update(id, params).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_timeline(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    state.timelines().delete(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chapter_meta_properties() -> Vec<MetaPropertyDto> {
    ChapterMetaConstants::get_all_properties()
}
