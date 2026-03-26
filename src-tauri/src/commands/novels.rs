use crate::ai::agent::handlers::GeneratedNovelInfo;
use crate::ai::agent::service::AgentService;
use crate::entity::agent_config::AgentCodes;
use crate::entity::novels;
use crate::repository::NovelUpdateParams;
use serde_json::json;
use serde_json::Value;
use tauri::State;

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

#[tauri::command]
pub async fn ai_generate_novel_info(
    state: State<'_, AppState>,
    requirement: String,
) -> Result<GeneratedNovelInfo, String> {
    eprintln!(
        "[ai_generate_novel_info] start requirement_len={} requirement={}",
        requirement.chars().count(),
        requirement
    );

    let result = AgentService::invoke(
        &state.db,
        AgentCodes::NOVEL_INFO_GENERATOR,
        json!({ "requirement": requirement }),
    )
    .await
    .map_err(|e| {
        eprintln!("[ai_generate_novel_info] invoke_error={:?}", e);
        e.to_string()
    })?;

    eprintln!(
        "[ai_generate_novel_info] raw_response_len={} raw_response={}",
        result.content.chars().count(),
        result.content
    );

    let cleaned_content = result
        .content
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim()
        .to_string();

    let normalized_content = normalize_json_like_content(&cleaned_content);

    let json_content = extract_json_object(&normalized_content)
        .ok_or_else(|| {
            eprintln!(
                "[ai_generate_novel_info] extract_json_failed cleaned_content={}",
                cleaned_content
            );
            format!("AI response did not contain valid JSON object. Original content: {}", cleaned_content)
        })?;

    let parsed_value: Value = serde_json::from_str(&json_content)
        .map_err(|e| {
            eprintln!(
                "[ai_generate_novel_info] parse_json_failed error={} json_content={} cleaned_content={}",
                e,
                json_content,
                cleaned_content
            );
            format!("Failed to parse AI response JSON: {}. Original content: {}", e, cleaned_content)
        })?;

    serde_json::from_value(parsed_value)
        .map_err(|e| {
            eprintln!(
                "[ai_generate_novel_info] convert_fields_failed error={} cleaned_content={}",
                e,
                cleaned_content
            );
            format!("Failed to convert AI response fields: {}. Original content: {}", e, cleaned_content)
        })
}

fn extract_json_object(content: &str) -> Option<String> {
    let start = content.find('{')?;
    let end = content.rfind('}')?;

    if end < start {
        return None;
    }

    Some(content[start..=end].trim().to_string())
}

fn normalize_json_like_content(content: &str) -> String {
    content
        .replace('“', "\"")
        .replace('”', "\"")
        .replace('‘', "'")
        .replace('’', "'")
        .replace('，', ",")
        .replace('：', ":")
}

#[cfg(test)]
mod tests {
    use super::extract_json_object;

    #[test]
    fn extracts_json_from_markdown_wrapper() {
        let content = "```json\n{\"title\":\"test\"}\n```";

        assert_eq!(extract_json_object(content).as_deref(), Some("{\"title\":\"test\"}"));
    }

    #[test]
    fn extracts_json_from_prefixed_text() {
        let content = "下面是结果：\n{\"title\":\"test\",\"style\":1}\n祝你创作愉快";

        assert_eq!(
            extract_json_object(content).as_deref(),
            Some("{\"title\":\"test\",\"style\":1}")
        );
    }

    #[test]
    fn normalizes_full_width_quotes_and_punctuation() {
        let content = "{\u{201c}title\u{201d}\u{ff1a}\u{201c}test\u{201d}\u{ff0c}\u{201c}style\u{201d}\u{ff1a}1}";

        assert_eq!(
            super::normalize_json_like_content(content),
            "{\"title\":\"test\",\"style\":1}"
        );
    }
}
