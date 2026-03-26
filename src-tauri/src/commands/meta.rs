use super::AppState;
use crate::ai::llm::executor::LlmExecutor;
use crate::ai::llm::service::LlmService;
use crate::constants::{MetaPropertyDto, NovelMetaConstants};
use crate::entity::novel_meta;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetaAiStreamChunk {
    pub request_id: String,
    pub delta: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetaAiStreamDone {
    pub request_id: String,
    pub content: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MetaAiStreamError {
    pub request_id: String,
    pub error: String,
}

#[tauri::command]
pub async fn create_meta(
    state: State<'_, AppState>,
    novel_id: i32,
    property_name: String,
    property_value: Option<String>,
) -> Result<novel_meta::Model, String> {
    state
        .meta()
        .create(novel_id, property_name, property_value)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_meta(
    state: State<'_, AppState>,
    novel_id: i32,
) -> Result<Vec<novel_meta::Model>, String> {
    state
        .meta()
        .find_by_novel(novel_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_meta_paged(
    state: State<'_, AppState>,
    novel_id: i32,
    page: u64,
    page_size: u64,
) -> Result<serde_json::Value, String> {
    let (items, total_pages) = state
        .meta()
        .find_by_novel_paged(novel_id, page, page_size)
        .await
        .map_err(|e| e.to_string())?;

    let total_count = state
        .meta()
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
pub async fn get_meta(
    state: State<'_, AppState>,
    id: i32,
) -> Result<Option<novel_meta::Model>, String> {
    state.meta().find_by_id(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_meta_by_name(
    state: State<'_, AppState>,
    novel_id: i32,
    property_name: String,
) -> Result<Option<novel_meta::Model>, String> {
    state
        .meta()
        .find_by_novel_and_name(novel_id, &property_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_meta(
    state: State<'_, AppState>,
    id: i32,
    property_value: Option<String>,
) -> Result<novel_meta::Model, String> {
    state
        .meta()
        .update(id, property_value)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn upsert_meta(
    state: State<'_, AppState>,
    novel_id: i32,
    property_name: String,
    property_value: Option<String>,
) -> Result<novel_meta::Model, String> {
    state
        .meta()
        .upsert(novel_id, property_name, property_value)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_meta(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    state.meta().delete(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_novel_meta_properties() -> Vec<MetaPropertyDto> {
    NovelMetaConstants::get_all_properties()
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn ai_generate_meta_stream(
    app: AppHandle,
    state: State<'_, AppState>,
    request_id: String,
    novel_id: i32,
    property_name: String,
    property_description: Option<String>,
    current_content: Option<String>,
    requirement: String,
) -> Result<(), String> {
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
    let metas = state.meta().find_by_novel(novel_id).await.map_err(|e| e.to_string())?;

    let llm = LlmService::get_default_llm(&state.db)
        .await
        .map_err(|e| e.to_string())?;
    let executor = LlmExecutor::from_config(&llm).map_err(|e| e.to_string())?;

    let system_prompt = [
        Some("你是专业的小说策划编辑，负责生成或改写小说元数据内容。输出应直接是可写入编辑器的正文内容，不要解释，不要使用代码块。".to_string()),
        settings_context,
    ]
    .into_iter()
    .flatten()
    .collect::<Vec<_>>()
    .join("\n\n");

    let meta_context = metas
        .iter()
        .filter(|m| m.property_name != property_name)
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

    let action_text = match current_content.as_deref().map(str::trim) {
        Some(content) if !content.is_empty() => format!(
            "当前元数据编辑器已有内容，请基于现有内容进行修改、扩展和重写，输出完整的新内容：\n{}",
            content
        ),
        _ => "当前元数据编辑器为空，请根据上下文新生成完整内容。".to_string(),
    };

    let user_prompt = format!(
        "{}\n\n当前要生成的元数据：\n- 名称：{}\n- 描述：{}\n\n其他已生成元数据：\n{}\n\n用户刚输入的补充要求：\n{}\n\n{}\n\n请直接输出最终正文内容。",
        novel_context,
        property_name,
        property_description.unwrap_or_default(),
        if meta_context.is_empty() { "（暂无）" } else { &meta_context },
        requirement,
        action_text
    );

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let app_handle = app.clone();
    let request_id_for_chunks = request_id.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(delta) = rx.recv().await {
            let _ = app_handle.emit(
                "meta-ai-stream-chunk",
                MetaAiStreamChunk {
                    request_id: request_id_for_chunks.clone(),
                    delta,
                },
            );
        }
    });

    match executor.stream_complete(&system_prompt, &user_prompt, tx).await {
        Ok(content) => {
            app.emit(
                "meta-ai-stream-done",
                MetaAiStreamDone { request_id, content },
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(err) => {
            app.emit(
                "meta-ai-stream-error",
                MetaAiStreamError {
                    request_id,
                    error: err.to_string(),
                },
            )
            .map_err(|e| e.to_string())?;
            Err(err.to_string())
        }
    }
}
