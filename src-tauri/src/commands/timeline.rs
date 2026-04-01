use super::AppState;
use crate::ai::agent::handlers::{ChapterTimelineInput, GeneratedTimelinePayload};
use crate::ai::agent::service::AgentService;
use crate::ai::events::{
    emit_generation_done, emit_generation_error, emit_phase_end, emit_phase_start,
};
use crate::ai::hooks::AiHookContext;
use crate::ai::policy::timeline_generation_options;
use crate::ai::tools::timeline::{ReadNovelMetaTool, ReadPreviousTimelinesTool};
use crate::constants::{ChapterMetaConstants, MetaPropertyDto};
use crate::entity::agent_config::AgentCodes;
use crate::entity::novel_chapter_timeline;
use crate::repository::TimelineUpdateParams;
use rig::tool::ToolDyn;
use tauri::{AppHandle, State};

fn build_timeline_meta_catalog() -> String {
    ChapterMetaConstants::get_all_properties()
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
    content: Option<String>,
    start_chapter_number: Option<i32>,
    end_chapter_number: Option<i32>,
) -> Result<novel_chapter_timeline::Model, String> {
    let params = TimelineUpdateParams {
        title,
        content,
        start_chapter_number,
        end_chapter_number,
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
    app: AppHandle,
    state: State<'_, AppState>,
    request_id: Option<String>,
    novel_id: i32,
    _timeline_id: Option<i32>,
    current_title: Option<String>,
    action: String,
    current_content: Option<String>,
    start_chapter_number: Option<i32>,
    end_chapter_number: Option<i32>,
    requirement: String,
) -> Result<GeneratedTimelinePayload, String> {
    let request_id =
        request_id.unwrap_or_else(|| format!("timeline-{}", crate::ai::events::now_timestamp_ms()));
    let options = timeline_generation_options();
    let event_namespace = "timeline";
    emit_phase_start(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::CHAPTER_TIMELINE,
        "preparing_context",
        Some("正在整理时间线生成输入".to_string()),
    );

    let db = &state.db;
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

    let current_trimmed = current_content.as_deref().unwrap_or("").trim();
    let chapter_start = start_chapter_number.unwrap_or(1);
    let chapter_end = end_chapter_number.unwrap_or(10);
    let current_context = match action.as_str() {
        "improve" if !current_trimmed.is_empty() => format!(
            "当前任务：你正在编辑第 {} 到第 {} 章的时间线。请优化现有时间线，在保留核心剧情方向的前提下提升逻辑、节奏与可执行性，并确保内容与小说元数据上下文一致。\n- 标题：{}\n- 正文：{}",
            chapter_start,
            chapter_end,
            current_title.clone().unwrap_or_default(),
            current_trimmed,
        ),
        "rewrite" if !current_trimmed.is_empty() => format!(
            "当前任务：你正在编辑第 {} 到第 {} 章的时间线。请重写现有时间线，可以调整组织方式和表述，但必须保留章节范围、核心剧情目标，并与小说元数据上下文保持一致。\n- 标题：{}\n- 正文：{}",
            chapter_start,
            chapter_end,
            current_title.clone().unwrap_or_default(),
            current_trimmed,
        ),
        "expand" if !current_trimmed.is_empty() => format!(
            "当前任务：你正在编辑第 {} 到第 {} 章的时间线。请扩展现有时间线，补充更多事件细节、冲突推进和人物作用，并确保不偏离小说元数据设定。\n- 标题：{}\n- 正文：{}",
            chapter_start,
            chapter_end,
            current_title.clone().unwrap_or_default(),
            current_trimmed,
        ),
        "condense" if !current_trimmed.is_empty() => format!(
            "当前任务：你正在编辑第 {} 到第 {} 章的时间线。请精简整理现有时间线，压缩冗余内容，保留最关键的创作提纲，并保持与小说元数据上下文一致。\n- 标题：{}\n- 正文：{}",
            chapter_start,
            chapter_end,
            current_title.clone().unwrap_or_default(),
            current_trimmed,
        ),
        "generate" if !current_trimmed.is_empty() => format!(
            "当前任务：你正在编辑第 {} 到第 {} 章的时间线。请参考现有时间线重新生成一版更完整的时间线标题与正文，并严格结合小说元数据上下文。\n- 标题：{}\n- 正文：{}",
            chapter_start,
            chapter_end,
            current_title.clone().unwrap_or_default(),
            current_trimmed,
        ),
        _ => format!(
            "当前任务：你正在编辑第 {} 到第 {} 章的时间线。请直接生成该章节区间的时间线标题和正文，并严格结合小说元数据上下文，不要写成其他章节的内容。",
            chapter_start,
            chapter_end
        ),
    };

    let requirement_text = requirement.trim();

    let input = ChapterTimelineInput {
        novel_context,
        available_meta_properties: build_timeline_meta_catalog(),
        metas_context: "如需补充世界观、设定、人物或约束，请调用工具读取小说元数据。".to_string(),
        previous_timelines: "如需保持剧情连续性，请调用工具读取已有时间线。".to_string(),
        chapter_start: chapter_start as u32,
        chapter_end: chapter_end as u32,
        current_context,
        requirement: (!requirement_text.is_empty()).then(|| requirement_text.to_string()),
    };
    let structured_input = serde_json::to_value(&input).map_err(|e| e.to_string())?;

    emit_phase_end(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::CHAPTER_TIMELINE,
        "preparing_context",
        Some("输入准备完成".to_string()),
    );
    emit_phase_start(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::CHAPTER_TIMELINE,
        "tool_reasoning",
        Some("AI 正在按需读取上下文并生成时间线".to_string()),
    );

    let db_for_tools = state.db.clone();
    let cache = crate::ai::tools::shared::ToolRequestCache::default();
    let build_tools = move || -> Vec<Box<dyn ToolDyn>> {
        vec![
            Box::new(ReadNovelMetaTool::new(
                db_for_tools.clone(),
                novel_id,
                cache.clone(),
            )),
            Box::new(ReadPreviousTimelinesTool::new(
                db_for_tools.clone(),
                novel_id,
                cache.clone(),
            )),
        ]
    };

    let result = AgentService::invoke_structured_with_observation(
        db,
        AgentCodes::CHAPTER_TIMELINE,
        structured_input,
        options.timeout_secs,
        options.retries,
        6,
        build_tools,
        AiHookContext {
            app: app.clone(),
            event_namespace: event_namespace.to_string(),
            request_id: request_id.clone(),
            agent_code: AgentCodes::CHAPTER_TIMELINE.to_string(),
            phase: "tool_reasoning".to_string(),
        },
    )
    .await;

    match result {
        Ok(payload) => {
            emit_phase_end(
                &app,
                event_namespace,
                &request_id,
                AgentCodes::CHAPTER_TIMELINE,
                "tool_reasoning",
                Some("时间线生成完成".to_string()),
            );
            emit_phase_start(
                &app,
                event_namespace,
                &request_id,
                AgentCodes::CHAPTER_TIMELINE,
                "finalizing_output",
                Some("正在整理最终结果".to_string()),
            );
            emit_phase_end(
                &app,
                event_namespace,
                &request_id,
                AgentCodes::CHAPTER_TIMELINE,
                "finalizing_output",
                Some("已返回标题与正文".to_string()),
            );
            emit_generation_done(
                &app,
                event_namespace,
                &request_id,
                AgentCodes::CHAPTER_TIMELINE,
                Some("时间线已生成".to_string()),
            );
            Ok(payload)
        }
        Err(err) => {
            emit_generation_error(
                &app,
                event_namespace,
                &request_id,
                AgentCodes::CHAPTER_TIMELINE,
                err.to_string(),
            );
            Err(err.to_string())
        }
    }
}
