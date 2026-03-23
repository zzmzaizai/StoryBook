use tauri::State;
use crate::entity::novels;
use crate::repository::NovelUpdateParams;
use super::AppState;

#[tauri::command]
pub async fn create_novel(state: State<'_, AppState>, title: String) -> Result<novels::Model, String> {
    state.novels().create(title).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_novels(
    state: State<'_, AppState>,
    page: u64,
    page_size: u64,
) -> Result<Vec<novels::Model>, String> {
    state.novels().find_all(page, page_size).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn count_novels(state: State<'_, AppState>) -> Result<u64, String> {
    state.novels().count().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_novel(state: State<'_, AppState>, id: i32) -> Result<Option<novels::Model>, String> {
    state.novels().find_by_id(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_novel(
    state: State<'_, AppState>,
    id: i32,
    title: String,
    description: Option<String>,
    image: Option<String>,
    style: i32,
    target_audience: i32,
    length_type: i32,
    is_focus: bool,
    estimated_chapter_count: Option<i32>,
    estimated_total_word_count: Option<i64>,
    estimated_words_per_chapter: Option<i32>,
    status: i32,
) -> Result<novels::Model, String> {
    let params = NovelUpdateParams {
        title: Some(title),
        description,
        image,
        style: Some(style),
        target_audience: Some(target_audience),
        length_type: Some(length_type),
        is_focus: Some(is_focus),
        estimated_chapter_count,
        estimated_total_word_count,
        estimated_words_per_chapter,
        status: Some(status),
    };
    state.novels().update(id, params).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_novel(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    state.novels().delete(id).await.map_err(|e| e.to_string())
}
