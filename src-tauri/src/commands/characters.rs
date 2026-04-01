use super::AppState;
use crate::ai::agent::handlers::{CharacterDesignInput, GeneratedCharacterPayload};
use crate::ai::agent::service::AgentService;
use crate::ai::events::{
    emit_generation_done, emit_generation_error, emit_phase_end, emit_phase_start,
};
use crate::ai::hooks::AiHookContext;
use crate::ai::policy::character_generation_options;
use crate::ai::tools::character::{ReadCharacterMetaTool, ReadExistingCharactersTool};
use crate::entity::agent_config::AgentCodes;
use crate::entity::characters;
use crate::repository::CharacterUpdateParams;
use rig::tool::ToolDyn;
use tauri::{AppHandle, State};

fn build_character_meta_catalog() -> String {
    crate::constants::NovelMetaConstants::get_all_properties()
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

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn ai_generate_character(
    app: AppHandle,
    state: State<'_, AppState>,
    request_id: Option<String>,
    novel_id: i32,
    character_id: Option<i32>,
    current_name: Option<String>,
    current_nickname: Option<String>,
    current_age: Option<String>,
    current_role_attribute: Option<i32>,
    current_gender: Option<i32>,
    current_character_type: Option<i32>,
    current_personality: Option<String>,
    mode: String,
    requirement: String,
) -> Result<GeneratedCharacterPayload, String> {
    let request_id = request_id
        .unwrap_or_else(|| format!("character-{}", crate::ai::events::now_timestamp_ms()));
    let event_namespace = "character";
    emit_phase_start(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::CHARACTER_DESIGN,
        "preparing_context",
        Some("正在整理角色生成输入".to_string()),
    );

    let novel = state
        .novels()
        .find_by_id(novel_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "小说不存在".to_string())?;

    let current_character_context = format!(
        "当前角色信息：\n- 名称：{}\n- 昵称：{}\n- 年龄：{}\n- 角色属性：{}\n- 性别：{}\n- 角色类型：{}\n- 性格特点：{}",
        current_name.as_deref().unwrap_or(""),
        current_nickname.as_deref().unwrap_or(""),
        current_age.as_deref().unwrap_or(""),
        role_attribute_label(current_role_attribute.unwrap_or(6)),
        gender_label(current_gender.unwrap_or(3)),
        character_type_label(current_character_type.unwrap_or(1)),
        current_personality.as_deref().unwrap_or(""),
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

    let input = CharacterDesignInput {
        novel_context,
        available_meta_properties: build_character_meta_catalog(),
        meta_context: "如需补充世界观、阵营、能力体系，请调用工具读取小说元数据。".to_string(),
        existing_characters_context: "如需避免角色重复，请调用工具读取已有角色。".to_string(),
        current_character_context,
        role_type: mode,
        requirement: (!requirement.trim().is_empty()).then_some(requirement),
    };
    let structured_input = serde_json::to_value(&input).map_err(|e| e.to_string())?;

    emit_phase_end(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::CHARACTER_DESIGN,
        "preparing_context",
        Some("输入准备完成".to_string()),
    );
    emit_phase_start(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::CHARACTER_DESIGN,
        "tool_reasoning",
        Some("AI 正在读取设定并生成角色".to_string()),
    );

    let options = character_generation_options();
    let db_for_tools = state.db.clone();
    let cache = crate::ai::tools::shared::ToolRequestCache::default();
    let build_tools = move || -> Vec<Box<dyn ToolDyn>> {
        vec![
            Box::new(ReadCharacterMetaTool::new(
                db_for_tools.clone(),
                novel_id,
                cache.clone(),
            )),
            Box::new(ReadExistingCharactersTool::new(
                db_for_tools.clone(),
                novel_id,
                character_id,
                cache.clone(),
            )),
        ]
    };

    let result: Result<GeneratedCharacterPayload, String> = AgentService::invoke_structured_with_observation(
        &state.db,
        AgentCodes::CHARACTER_DESIGN,
        structured_input,
        options.timeout_secs,
        options.retries,
        6,
        build_tools,
        AiHookContext {
            app: app.clone(),
            event_namespace: event_namespace.to_string(),
            request_id: request_id.clone(),
            agent_code: AgentCodes::CHARACTER_DESIGN.to_string(),
            phase: "tool_reasoning".to_string(),
        },
    )
    .await
    .map_err(|e| e.to_string());

    let mut payload = match result {
        Ok(payload) => payload,
        Err(err) => {
            emit_generation_error(
                &app,
                event_namespace,
                &request_id,
                AgentCodes::CHARACTER_DESIGN,
                err.clone(),
            );
            return Err(err);
        }
    };

    payload.role_attribute = normalize_role_attribute(payload.role_attribute);
    payload.gender = normalize_gender(payload.gender);
    payload.character_type = normalize_character_type(payload.character_type);

    emit_phase_end(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::CHARACTER_DESIGN,
        "tool_reasoning",
        Some("角色内容已生成".to_string()),
    );
    emit_generation_done(
        &app,
        event_namespace,
        &request_id,
        AgentCodes::CHARACTER_DESIGN,
        Some("角色已生成".to_string()),
    );

    Ok(payload)
}

fn role_attribute_label(value: i32) -> &'static str {
    match value {
        1 => "主角",
        2 => "女主角",
        3 => "男主角",
        4 => "反派",
        5 => "配角",
        _ => "路人",
    }
}

fn gender_label(value: i32) -> &'static str {
    match value {
        1 => "男性",
        2 => "女性",
        _ => "中性",
    }
}

fn character_type_label(value: i32) -> &'static str {
    match value {
        2 => "非人类",
        _ => "人类",
    }
}

fn normalize_role_attribute(value: i32) -> i32 {
    if (1..=6).contains(&value) {
        value
    } else {
        5
    }
}

fn normalize_gender(value: i32) -> i32 {
    if (1..=3).contains(&value) {
        value
    } else {
        3
    }
}

fn normalize_character_type(value: i32) -> i32 {
    if (1..=2).contains(&value) {
        value
    } else {
        1
    }
}
