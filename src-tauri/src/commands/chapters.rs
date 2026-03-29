use super::AppState;
use crate::ai::agent::service::AgentService;
use crate::entity::agent_config::AgentCodes;
use crate::entity::chapters;
use crate::repository::ChapterUpdateParams;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChapterAiStreamChunk {
    pub request_id: String,
    pub delta: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChapterAiStreamDone {
    pub request_id: String,
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ChapterAiStreamError {
    pub request_id: String,
    pub error: String,
}

#[tauri::command]
pub async fn create_chapter(
    state: State<'_, AppState>,
    novel_id: i32,
    chapter_name: String,
) -> Result<chapters::Model, String> {
    state
        .chapters()
        .create(novel_id, chapter_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_chapters(
    state: State<'_, AppState>,
    novel_id: i32,
    page: u64,
    page_size: u64,
) -> Result<serde_json::Value, String> {
    let items = state
        .chapters()
        .find_by_novel(novel_id, page, page_size)
        .await
        .map_err(|e| e.to_string())?;

    let total_count = state
        .chapters()
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
pub async fn get_chapter(
    state: State<'_, AppState>,
    id: i32,
) -> Result<Option<chapters::Model>, String> {
    state
        .chapters()
        .find_by_id(id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_next_chapter_number(
    state: State<'_, AppState>,
    novel_id: i32,
) -> Result<i32, String> {
    state
        .chapters()
        .get_next_chapter_number(novel_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_chapter(
    state: State<'_, AppState>,
    id: i32,
    chapter_number: i32,
    chapter_name: String,
    content: Option<String>,
    status: i32,
) -> Result<chapters::Model, String> {
    let params = ChapterUpdateParams {
        chapter_number: Some(chapter_number),
        chapter_name: Some(chapter_name),
        content,
        status: Some(status),
        increment_version: Some(true),
    };
    state
        .chapters()
        .update(id, params)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_chapter(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    state.chapters().delete(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn ai_generate_chapter_stream(
    app: AppHandle,
    state: State<'_, AppState>,
    request_id: String,
    novel_id: i32,
    chapter_id: Option<i32>,
    current_chapter_number: i32,
    current_chapter_name: Option<String>,
    current_status: Option<i32>,
    current_content: Option<String>,
    mode: String,
    requirement: String,
) -> Result<(), String> {
    let novel = state
        .novels()
        .find_by_id(novel_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "小说不存在".to_string())?;
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
    let chapters = state
        .chapters()
        .find_all_by_novel(novel_id)
        .await
        .map_err(|e| e.to_string())?;

    let meta_context = metas
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

    let related_timeline = timelines.iter().find(|item| {
        let start = item.start_chapter_number.unwrap_or(i32::MIN);
        let end = item.end_chapter_number.unwrap_or(i32::MAX);
        current_chapter_number >= start && current_chapter_number <= end
    });

    let related_timeline_context = related_timeline
        .map(|item| {
            format!(
                "当前章节命中的时间线：\n- 标题：{}\n- 章节范围：{}-{}\n- 描述：{}\n- 大纲：{}\n- 角色安排：{}",
                item.title,
                item.start_chapter_number.unwrap_or(0),
                item.end_chapter_number.unwrap_or(0),
                item.description.as_deref().unwrap_or(""),
                item.timeline_outline.as_deref().unwrap_or(""),
                item.characters_description.as_deref().unwrap_or("")
            )
        })
        .unwrap_or_else(|| "当前章节暂未匹配到明确时间线，请结合已有设定合理创作。".to_string());

    let previous_chapters_context =
        build_previous_chapters_context(&chapters, chapter_id, current_chapter_number, 3);

    let chapter_context = format!(
        "当前章节信息：\n- 章节号：{}\n- 章节名：{}\n- 章节状态：{}",
        current_chapter_number,
        current_chapter_name.as_deref().unwrap_or(""),
        current_status.unwrap_or(0)
    );

    let novel_context = format!(
        "小说基础信息：\n- 标题：{}\n- 简介：{}\n- 风格：{}\n- 目标读者：{}\n- 篇幅：{}\n- 原始需求：{}",
        novel.title,
        novel.description.as_deref().unwrap_or(""),
        novel.style,
        novel.target_audience,
        novel.length_type,
        novel.original_description.as_deref().unwrap_or("")
    );

    let mode_instruction =
        build_chapter_mode_instruction(&mode, current_content.as_deref().unwrap_or(""));

    let input = serde_json::json!({
        "novel_id": novel_id,
        "novel_context": novel_context,
        "meta_context": if meta_context.is_empty() { None::<String> } else { Some(meta_context) },
        "related_timeline_context": related_timeline_context,
        "previous_chapters_context": if previous_chapters_context.is_empty() { None::<String> } else { Some(previous_chapters_context) },
        "chapter_context": chapter_context,
        "requirement": requirement,
        "mode_instruction": mode_instruction,
    });

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let app_handle = app.clone();
    let request_id_for_chunks = request_id.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(delta) = rx.recv().await {
            let _ = app_handle.emit(
                "chapter-ai-stream-chunk",
                ChapterAiStreamChunk {
                    request_id: request_id_for_chunks.clone(),
                    delta,
                },
            );
        }
    });

    match AgentService::invoke_stream(&state.db, AgentCodes::CHAPTER_CONTENT, input, tx).await {
        Ok(result) => {
            app.emit(
                "chapter-ai-stream-done",
                ChapterAiStreamDone {
                    request_id,
                    content: result.content,
                },
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(err) => {
            app.emit(
                "chapter-ai-stream-error",
                ChapterAiStreamError {
                    request_id,
                    error: err.to_string(),
                },
            )
            .map_err(|e| e.to_string())?;
            Err(err.to_string())
        }
    }
}

fn build_previous_chapters_context(
    chapters: &[chapters::Model],
    current_chapter_id: Option<i32>,
    current_chapter_number: i32,
    limit: usize,
) -> String {
    let mut items: Vec<_> = chapters
        .iter()
        .filter(|item| Some(item.id) != current_chapter_id)
        .filter(|item| item.chapter_number < current_chapter_number)
        .collect();

    items.sort_by_key(|item| item.chapter_number);

    items
        .into_iter()
        .rev()
        .take(limit)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .map(|item| {
            format!(
                "- 第{}章《{}》：{}",
                item.chapter_number,
                item.chapter_name,
                summarize_text(item.content.as_deref().unwrap_or(""), 260)
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn build_chapter_mode_instruction(mode: &str, current_content: &str) -> String {
    let trimmed = current_content.trim();
    match mode {
        "rewrite" if !trimmed.is_empty() => format!(
            "当前任务是改写当前章节。请保留核心剧情目标，但重写成更完整、更流畅的新版本。当前内容：\n{}",
            trimmed
        ),
        "expand" if !trimmed.is_empty() => format!(
            "当前任务是扩写当前章节。请保持主要剧情不变，补足细节、情绪、动作、环境与对话，输出完整扩写版。当前内容：\n{}",
            trimmed
        ),
        "continue" if !trimmed.is_empty() => format!(
            "当前任务是续写当前章节。请以前文为起点继续推进剧情，输出包含已有内容与续写结果的完整章节版本。当前内容：\n{}",
            trimmed
        ),
        "polish" if !trimmed.is_empty() => format!(
            "当前任务是润色当前章节。请尽量不改变主剧情和事件顺序，只提升文笔、节奏、氛围和可读性，输出完整润色版。当前内容：\n{}",
            trimmed
        ),
        _ if !trimmed.is_empty() => format!(
            "当前编辑器已有内容，请基于它生成新的完整章节版本：\n{}",
            trimmed
        ),
        _ => "当前编辑器为空，请根据所有上下文直接新写这一章的完整正文。".to_string(),
    }
}

fn summarize_text(content: &str, max_chars: usize) -> String {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return "（暂无正文）".to_string();
    }

    let summary = trimmed.chars().take(max_chars).collect::<String>();
    if trimmed.chars().count() > max_chars {
        format!("{}...", summary)
    } else {
        summary
    }
}
