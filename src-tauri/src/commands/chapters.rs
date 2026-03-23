use tauri::State;
use crate::entity::chapters;
use crate::repository::ChapterUpdateParams;
use super::AppState;

#[tauri::command]
pub async fn create_chapter(
    state: State<'_, AppState>,
    novel_id: i32,
    chapter_name: String,
) -> Result<chapters::Model, String> {
    state.chapters().create(novel_id, chapter_name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_chapters(
    state: State<'_, AppState>,
    novel_id: i32,
    page: u64,
    page_size: u64,
) -> Result<Vec<chapters::Model>, String> {
    state.chapters().find_by_novel(novel_id, page, page_size).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_chapter(state: State<'_, AppState>, id: i32) -> Result<Option<chapters::Model>, String> {
    state.chapters().find_by_id(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_chapter(
    state: State<'_, AppState>,
    id: i32,
    chapter_name: String,
    content: Option<String>,
    status: i32,
) -> Result<chapters::Model, String> {
    let params = ChapterUpdateParams {
        chapter_name: Some(chapter_name),
        content,
        status: Some(status),
        increment_version: Some(true),
    };
    state.chapters().update(id, params).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_chapter(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    state.chapters().delete(id).await.map_err(|e| e.to_string())
}
