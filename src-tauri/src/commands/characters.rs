use super::AppState;
use crate::ai::agent::handlers::CharacterDesignInput;
use crate::ai::policy::character_generation_options;
use crate::ai::structured::generate_structured;
use crate::entity::agent_config::AgentCodes;
use crate::entity::characters;
use crate::repository::CharacterUpdateParams;
use schemars::JsonSchema;
use tauri::State;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, JsonSchema)]
pub struct GeneratedCharacterPayload {
    #[schemars(description = "角色名称，避免与已有角色重复")]
    pub name: String,
    #[schemars(description = "昵称或常用称呼；如不适合可留空字符串")]
    pub nickname: String,
    #[schemars(description = "年龄描述；不确定时可用大致年龄段")]
    pub age: String,
    #[schemars(description = "角色属性代码，1主角/2女主角/3男主角/4反派/5配角/6路人")]
    pub role_attribute: i32,
    #[schemars(description = "性别代码，1男性/2女性/3中性")]
    pub gender: i32,
    #[schemars(description = "角色类型代码，1人类/2非人类")]
    pub character_type: i32,
    #[schemars(
        description = "Markdown 形式的人设正文，体现性格、动机、矛盾点、剧情作用和关系张力"
    )]
    pub personality: String,
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
    state: State<'_, AppState>,
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
    let characters = state
        .characters()
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

    let existing_characters_context = characters
        .iter()
        .filter(|item| Some(item.id) != character_id)
        .map(|item| {
            format!(
                "- {}｜{}｜{}｜{}｜{}",
                item.name,
                role_attribute_label(item.role_attribute),
                gender_label(item.gender),
                character_type_label(item.character_type),
                summarize_text(item.personality.as_deref().unwrap_or(""), 80)
            )
        })
        .collect::<Vec<_>>()
        .join("\n");

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
        meta_context,
        existing_characters_context,
        current_character_context,
        role_type: mode,
        requirement: (!requirement.trim().is_empty()).then_some(requirement),
    };
    let structured_input = serde_json::to_value(&input).map_err(|e| e.to_string())?;

    let mut payload: GeneratedCharacterPayload = generate_structured(
        &state.db,
        AgentCodes::CHARACTER_DESIGN,
        structured_input,
        character_generation_options(),
    )
    .await
    .map_err(|e| e.to_string())?;

    payload.role_attribute = normalize_role_attribute(payload.role_attribute);
    payload.gender = normalize_gender(payload.gender);
    payload.character_type = normalize_character_type(payload.character_type);
    Ok(payload)
}

fn summarize_text(content: &str, max_chars: usize) -> String {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return "暂无明显人设描述".to_string();
    }

    let summary = trimmed.chars().take(max_chars).collect::<String>();
    if trimmed.chars().count() > max_chars {
        format!("{}...", summary)
    } else {
        summary
    }
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
