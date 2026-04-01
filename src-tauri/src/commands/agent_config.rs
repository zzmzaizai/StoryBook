use sea_orm::prelude::Json;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::AppState;
use crate::repository::agent_config::AgentRuntimeConfigUpsertParams;
use crate::repository::AgentConfigRepository;

#[derive(Debug, Serialize)]
pub struct AgentDefinitionResponse {
    pub agent_code: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub icon: Option<String>,
    pub order: i32,
    pub streaming: bool,
    pub output_format: String,
    pub builtin: bool,
    pub ui_entry: Option<String>,
    pub system_prompt: String,
    pub user_template: Option<String>,
    pub extra_config_schema: Vec<crate::ai::prompts::AgentExtraFieldDefinition>,
    pub llm_config_id: Option<i32>,
    pub extra_config: Option<Json>,
    pub has_runtime_config: bool,
}

#[derive(Debug, Deserialize)]
pub struct SaveAgentRuntimeConfigRequest {
    pub agent_code: String,
    pub llm_config_id: Option<i32>,
    pub extra_config: Option<Json>,
}

#[tauri::command]
pub async fn list_agent_definitions(
    state: State<'_, AppState>,
) -> Result<Vec<AgentDefinitionResponse>, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    let runtime_configs = repo.find_all().await.map_err(|e| e.to_string())?;
    let definitions = crate::ai::prompts::list_agent_definitions()
        .await
        .map_err(|e| e.to_string())?;

    Ok(definitions
        .into_iter()
        .map(|definition| {
            let runtime = runtime_configs
                .iter()
                .find(|item| item.agent_code == definition.agent.code);

            AgentDefinitionResponse {
                agent_code: definition.agent.code.clone(),
                name: definition.agent.name.clone(),
                description: definition.agent.description.clone(),
                category: definition.agent.category.clone(),
                icon: definition.agent.icon.clone(),
                order: definition.agent.order,
                streaming: definition.agent.streaming,
                output_format: definition.agent.output_format.clone(),
                builtin: definition.agent.builtin,
                ui_entry: definition.agent.ui_entry.clone(),
                system_prompt: definition.prompt.system_prompt.clone(),
                user_template: definition.prompt.user_template.clone(),
                extra_config_schema: definition.extra_config_schema(),
                llm_config_id: runtime.and_then(|item| item.llm_config_id),
                extra_config: runtime.and_then(|item| item.extra_config.clone()),
                has_runtime_config: runtime.is_some(),
            }
        })
        .collect())
}

#[tauri::command]
pub async fn get_agent_definition(
    state: State<'_, AppState>,
    agent_code: String,
) -> Result<AgentDefinitionResponse, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    let runtime = repo
        .find_by_agent_code(&agent_code)
        .await
        .map_err(|e| e.to_string())?;
    let definition = crate::ai::prompts::get_agent_definition(&agent_code)
        .await
        .map_err(|e| e.to_string())?;
    let extra_config_schema = definition.extra_config_schema();

    Ok(AgentDefinitionResponse {
        agent_code: definition.agent.code,
        name: definition.agent.name,
        description: definition.agent.description,
        category: definition.agent.category,
        icon: definition.agent.icon,
        order: definition.agent.order,
        streaming: definition.agent.streaming,
        output_format: definition.agent.output_format,
        builtin: definition.agent.builtin,
        ui_entry: definition.agent.ui_entry,
        system_prompt: definition.prompt.system_prompt,
        user_template: definition.prompt.user_template,
        extra_config_schema,
        llm_config_id: runtime.as_ref().and_then(|item| item.llm_config_id),
        extra_config: runtime.as_ref().and_then(|item| item.extra_config.clone()),
        has_runtime_config: runtime.is_some(),
    })
}

#[tauri::command]
pub async fn save_agent_runtime_config(
    state: State<'_, AppState>,
    req: SaveAgentRuntimeConfigRequest,
) -> Result<(), String> {
    crate::ai::prompts::get_agent_definition(&req.agent_code)
        .await
        .map_err(|e| e.to_string())?;

    let repo = AgentConfigRepository::new(state.db.clone());
    repo.upsert(AgentRuntimeConfigUpsertParams {
        agent_code: req.agent_code,
        llm_config_id: req.llm_config_id,
        extra_config: req.extra_config,
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn reset_agent_runtime_config(
    state: State<'_, AppState>,
    agent_code: String,
) -> Result<(), String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.delete_by_agent_code(&agent_code)
        .await
        .map_err(|e| e.to_string())
}
