use super::AppState;
use crate::ai::agent::handlers::MetaGeneratorInput;
use crate::ai::agent::service::AgentService;
use crate::ai::events::{
    emit_generation_done, emit_generation_error, emit_phase_end, emit_phase_start,
};
use crate::ai::hooks::AiHookContext;
use crate::ai::tools::meta::{ReadCharacterContextTool, ReadMetaContextTool};
use crate::constants::{MetaPropertyDto, NovelMetaConstants};
use crate::entity::agent_config::AgentCodes;
use crate::entity::novel_meta;
use rig::tool::ToolDyn;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;

fn build_meta_property_catalog() -> String {
    NovelMetaConstants::get_all_properties()
        .into_iter()
        .map(|item| {
            format!(
                "- [{}] {}（{}）：{}",
                item.priority_level, item.property_name, item.group_name, item.property_description
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn build_existing_meta_summary(items: &[novel_meta::Model], current_property_name: &str) -> String {
    items
        .iter()
        .filter(|item| item.property_name != current_property_name)
        .filter_map(|item| {
            let value = item.property_value.as_deref()?.trim();
            if value.is_empty() {
                None
            } else {
                Some(format!(
                    "- {}：{}",
                    item.property_name,
                    summarize_text(value, 180)
                ))
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn summarize_text(content: &str, max_chars: usize) -> String {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return "（暂无内容）".to_string();
    }

    let summary = trimmed.chars().take(max_chars).collect::<String>();
    if trimmed.chars().count() > max_chars {
        format!("{}...", summary)
    } else {
        summary
    }
}

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
    action: String,
    current_content: Option<String>,
    requirement: String,
) -> Result<(), String> {
    let event_namespace = "meta";
    emit_phase_start(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::META_GENERATOR,
        "preparing_context",
        Some("正在整理元数据输入".to_string()),
    );

    let novel = state
        .novels()
        .find_by_id(novel_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "小说不存在".to_string())?;

    let novel_context = format!(
        "小说基础信息：\n- 标题：{}\n- 简介：{}\n- 风格：{}\n- 目标读者：{}\n- 篇幅：{}\n- 原始需求：{}",
        novel.title,
        novel.description.as_deref().unwrap_or(""),
        novel.style,
        novel.target_audience,
        novel.length_type,
        novel.original_description.as_deref().unwrap_or("")
    );

    let metas = state
        .meta()
        .find_by_novel(novel_id)
        .await
        .map_err(|e| e.to_string())?;
    let meta_context = build_existing_meta_summary(&metas, &property_name);

    let input = MetaGeneratorInput {
        novel_context,
        available_meta_properties: Some(build_meta_property_catalog()),
        property_name: property_name.clone(),
        property_description,
        action: Some(action),
        meta_context: Some(if meta_context.is_empty() {
            "（暂无其他已生成元数据）".to_string()
        } else {
            meta_context
        }),
        current_content,
        requirement,
    };
    let input = serde_json::to_value(&input).map_err(|e| e.to_string())?;

    emit_phase_end(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::META_GENERATOR,
        "preparing_context",
        Some("输入准备完成".to_string()),
    );
    emit_phase_start(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::META_GENERATOR,
        "tool_reasoning",
        Some("AI 正在读取设定并生成正文".to_string()),
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

    let db_for_tools = state.db.clone();
    let property_name_for_tools = property_name.clone();
    let cache = crate::ai::tools::shared::ToolRequestCache::default();
    let build_tools = move || -> Vec<Box<dyn ToolDyn>> {
        vec![
            Box::new(ReadMetaContextTool::new(
                db_for_tools.clone(),
                novel_id,
                property_name_for_tools.clone(),
                cache.clone(),
            )),
            Box::new(ReadCharacterContextTool::new(
                db_for_tools.clone(),
                novel_id,
                cache.clone(),
            )),
        ]
    };

    match AgentService::invoke_stream_with_observation(
        &state.db,
        AgentCodes::META_GENERATOR,
        input,
        None,
        1,
        6,
        build_tools,
        AiHookContext {
            app: app.clone(),
            event_namespace: event_namespace.to_string(),
            request_id: request_id.clone(),
            agent_code: AgentCodes::META_GENERATOR.to_string(),
            phase: "tool_reasoning".to_string(),
        },
        tx,
    )
    .await
    {
        Ok(result) => {
            emit_phase_end(
                &app,
                event_namespace,
                &request_id,
                AgentCodes::META_GENERATOR,
                "tool_reasoning",
                Some("元数据正文已生成".to_string()),
            );
            emit_generation_done(
                &app,
                event_namespace,
                &request_id,
                AgentCodes::META_GENERATOR,
                Some("元数据已生成".to_string()),
            );
            app.emit(
                "meta-ai-stream-done",
                MetaAiStreamDone {
                    request_id,
                    content: result.content,
                },
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(err) => {
            emit_generation_error(
                &app,
                event_namespace,
                &request_id,
                AgentCodes::META_GENERATOR,
                err.to_string(),
            );
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
