use super::AppState;
use crate::ai::llm::executor::LlmExecutor;
use crate::ai::llm::service::LlmService;
use crate::constants::{ChapterMetaConstants, MetaPropertyDto};
use crate::entity::novel_chapter_timeline;
use crate::repository::TimelineUpdateParams;
use tauri::State;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GeneratedTimelinePayload {
    pub title: String,
    pub description: String,
    pub timeline_outline: String,
    pub characters_description: String,
}

#[tauri::command]
pub async fn create_timeline(
    state: State<'_, AppState>,
    novel_id: i32,
    title: String,
) -> Result<novel_chapter_timeline::Model, String> {
    state
        .timelines()
        .create(novel_id, title)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_timelines(
    state: State<'_, AppState>,
    novel_id: i32,
) -> Result<Vec<novel_chapter_timeline::Model>, String> {
    state
        .timelines()
        .find_by_novel(novel_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_timelines_paged(
    state: State<'_, AppState>,
    novel_id: i32,
    page: u64,
    page_size: u64,
) -> Result<serde_json::Value, String> {
    let (items, total_pages) = state
        .timelines()
        .find_by_novel_paged(novel_id, page, page_size)
        .await
        .map_err(|e| e.to_string())?;

    let total_count = state
        .timelines()
        .count_by_novel(novel_id)
        .await
        .map_err(|e| e.to_string())?;

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
pub async fn get_timeline(
    state: State<'_, AppState>,
    id: i32,
) -> Result<Option<novel_chapter_timeline::Model>, String> {
    state
        .timelines()
        .find_by_id(id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
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
    state
        .timelines()
        .update(id, params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_timeline(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    state
        .timelines()
        .delete(id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chapter_meta_properties() -> Vec<MetaPropertyDto> {
    ChapterMetaConstants::get_all_properties()
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn ai_generate_timeline(
    state: State<'_, AppState>,
    novel_id: i32,
    timeline_id: Option<i32>,
    current_title: Option<String>,
    current_description: Option<String>,
    current_outline: Option<String>,
    current_characters_description: Option<String>,
    start_chapter_number: Option<i32>,
    end_chapter_number: Option<i32>,
    requirement: String,
) -> Result<GeneratedTimelinePayload, String> {
    let novel = state
        .novels()
        .find_by_id(novel_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "小说不存在".to_string())?;
    let settings_context = state
        .novel_settings()
        .get_prompt_context(novel_id)
        .await
        .map_err(|e| e.to_string())?;
    let metas = state
        .meta()
        .find_by_novel(novel_id)
        .await
        .map_err(|e| e.to_string())?;
    let timelines = state
        .timelines()
        .find_by_novel(novel_id)
        .await
        .map_err(|e| e.to_string())?;

    let previous_timelines =
        build_previous_timeline_context(&timelines, timeline_id, start_chapter_number);

    let metas_context = metas
        .iter()
        .filter_map(|m| {
            m.property_value.as_ref().and_then(|value| {
                let trimmed = value.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(format!("- {}：{}", m.property_name, trimmed))
                }
            })
        })
        .collect::<Vec<_>>()
        .join("\n");

    let novel_context = format!(
        "小说基础信息：\n- 标题：{}\n- 简介：{}\n- 风格：{}\n- 目标读者：{}\n- 篇幅：{}\n- 原始需求：{}",
        novel.title,
        novel.description.as_deref().unwrap_or(""),
        novel.style,
        novel.target_audience,
        novel.length_type,
        novel.original_description.as_deref().unwrap_or("")
    );

    let current_context = match current_outline.as_deref().map(str::trim) {
        Some(content) if !content.is_empty() => format!(
            "当前正在修改已有时间线，请基于以下已有内容改造成新版本：\n- 标题：{}\n- 描述：{}\n- 大纲：{}\n- 人物：{}",
            current_title.clone().unwrap_or_default(),
            current_description.clone().unwrap_or_default(),
            content,
            current_characters_description.clone().unwrap_or_default(),
        ),
        _ => format!(
            "当前是新生成时间线，请基于章节范围生成标题、描述、大纲和人物安排：\n- 起始章节：{}\n- 结束章节：{}",
            start_chapter_number.unwrap_or(1),
            end_chapter_number.unwrap_or(10)
        ),
    };

    let system_prompt = [
        Some("你是专业的小说分卷与时间线策划编辑。你必须返回一个合法 JSON 对象，不要输出 markdown 代码块，不要输出 JSON 以外的任何解释文字。JSON 必须包含字段：title, description, timeline_outline, characters_description。".to_string()),
        settings_context,
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join("\n\n");

    let user_prompt = format!(
        "{}\n\n其他已生成元数据：\n{}\n\n其他已生成好的小说时间线（最多往前20条）：\n{}\n\n用户刚输入的补充要求：\n{}\n\n{}\n\n请严格输出 JSON：\n{{\n  \"title\": \"小卷标题\",\n  \"description\": \"这一卷的简述\",\n  \"timeline_outline\": \"完整时间线大纲\",\n  \"characters_description\": \"本卷涉及角色与作用\"\n}}",
        novel_context,
        if metas_context.is_empty() { "（暂无）" } else { &metas_context },
        if previous_timelines.is_empty() { "（暂无）" } else { &previous_timelines },
        requirement,
        current_context,
    );

    let llm = LlmService::get_default_llm(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    let executor = LlmExecutor::from_config(&llm).map_err(|e| e.to_string())?;
    let raw = executor
        .complete(&system_prompt, &user_prompt)
        .await
        .map_err(|e| e.to_string())?;

    let cleaned_content = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim()
        .to_string();
    let normalized_content = normalize_json_like_content(&cleaned_content);
    let json_content =
        extract_json_object(&normalized_content).ok_or_else(|| "AI 未返回合法 JSON".to_string())?;

    serde_json::from_str::<GeneratedTimelinePayload>(&json_content).map_err(|e| e.to_string())
}

fn build_previous_timeline_context(
    timelines: &[novel_chapter_timeline::Model],
    current_timeline_id: Option<i32>,
    current_start: Option<i32>,
) -> String {
    let mut items: Vec<_> = timelines
        .iter()
        .filter(|item| Some(item.id) != current_timeline_id)
        .filter(|item| match (item.start_chapter_number, current_start) {
            (Some(start), Some(current)) => start < current,
            _ => true,
        })
        .collect();

    items.sort_by_key(|item| item.start_chapter_number.unwrap_or(0));

    items
        .into_iter()
        .rev()
        .take(20)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|item| {
            format!(
                "- {}（{}-{}章）：{}",
                item.title,
                item.start_chapter_number.unwrap_or(0),
                item.end_chapter_number.unwrap_or(0),
                item.timeline_outline.as_deref().unwrap_or("")
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn extract_json_object(content: &str) -> Option<String> {
    let start = content.find('{')?;
    let end = content.rfind('}')?;
    if end < start {
        return None;
    }
    Some(content[start..=end].to_string())
}

fn normalize_json_like_content(content: &str) -> String {
    content.replace(['“', '”'], "\"").replace(['‘', '’'], "'")
}
