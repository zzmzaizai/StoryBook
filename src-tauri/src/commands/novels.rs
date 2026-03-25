use tauri::State;
use crate::entity::novels;
use crate::repository::NovelUpdateParams;
use crate::ai::agent::handlers::GeneratedNovelInfo;
use crate::ai::agent::factory::AgentFactory;
use crate::ai::llm::service::LlmService;
use serde_json::json;
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

/// AI 生成小说基础信息
/// 
/// 根据用户输入的小说要求描述，使用 AI 生成小说的基础信息
#[tauri::command]
pub async fn ai_generate_novel_info(
    state: State<'_, AppState>,
    requirement: String,
) -> Result<GeneratedNovelInfo, String> {
    let db = state.db();
    
    let factory = AgentFactory::new();
    
    let agent_config = crate::repository::AgentConfigRepository::new(std::sync::Arc::new(db.clone()))
        .find_by_agent_code("novel_info_generator")
        .await
        .map_err(|e| e.to_string())?
        .filter(|c| c.enabled)
        .ok_or_else(|| "Agent novel_info_generator not found or disabled".to_string())?;

    let llm_config = LlmService::get_llm_for_agent(db, agent_config.llm_config_id)
        .await
        .map_err(|e| e.to_string())?;

    let system_prompt = if agent_config.use_system_prompt {
        crate::ai::prompts::load_prompt("novel_info_generator")
            .await
            .unwrap_or_else(|_| "你是一个专业的网络小说编辑。".to_string())
    } else {
        String::new()
    };

    let input = json!({
        "requirement": requirement
    });

    let result = factory
        .invoke_with_llm(db, "novel_info_generator", llm_config.id, input)
        .await
        .map_err(|e| e.to_string())?;

    let content = result.content.trim();
    
    let cleaned_content = content
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let novel_info: GeneratedNovelInfo = serde_json::from_str(cleaned_content)
        .map_err(|e| format!("Failed to parse AI response: {}. Original content: {}", e, cleaned_content))?;

    Ok(novel_info)
}