use super::AppState;
use crate::entity::characters;
use crate::repository::CharacterUpdateParams;
use tauri::State;

#[tauri::command]
pub async fn create_character(
    state: State<'_, AppState>,
    novel_id: i32,
    name: String,
) -> Result<characters::Model, String> {
    state
        .characters()
        .create(novel_id, name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_characters(
    state: State<'_, AppState>,
    novel_id: i32,
    page: u64,
    page_size: u64,
) -> Result<serde_json::Value, String> {
    let items = state
        .characters()
        .find_by_novel(novel_id, page, page_size)
        .await
        .map_err(|e| e.to_string())?;

    let total_count = state
        .characters()
        .count_by_novel(novel_id)
        .await
        .map_err(|e| e.to_string())?;

    let total_pages = total_count.div_ceil(page_size);

    Ok(serde_json::json!({
        "items": items,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "total_count": total_count,
        "has_more": page + 1 < total_pages
    }))
}

#[tauri::command]
pub async fn get_character(
    state: State<'_, AppState>,
    id: i32,
) -> Result<Option<characters::Model>, String> {
    state
        .characters()
        .find_by_id(id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn save_character(
    state: State<'_, AppState>,
    id: i32,
    name: String,
    nickname: Option<String>,
    age: Option<String>,
    personality: Option<String>,
    role_attribute: i32,
    gender: i32,
    character_type: i32,
    sort_order: i32,
) -> Result<characters::Model, String> {
    let params = CharacterUpdateParams {
        name: Some(name),
        nickname,
        age,
        personality,
        role_attribute: Some(role_attribute),
        gender: Some(gender),
        character_type: Some(character_type),
        sort_order: Some(sort_order),
    };
    state
        .characters()
        .update(id, params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_character(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    state
        .characters()
        .delete(id)
        .await
        .map_err(|e| e.to_string())
}
