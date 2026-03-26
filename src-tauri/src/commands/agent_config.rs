//! Agent 配置 Commands
//!
//! 提供 Agent 配置的增删改查接口，供前端调用。

use sea_orm::prelude::Json;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::AppState;
use crate::repository::{AgentConfigCreateParams, AgentConfigRepository, AgentConfigUpdateParams};

/// Agent 配置响应体
#[derive(Serialize)]
pub struct AgentConfigResponse {
    pub id: i32,
    pub agent_code: String,
    pub name: String,
    pub description: Option<String>,
    pub llm_config_id: Option<i32>,
    pub custom_prompt: Option<String>,
    pub use_system_prompt: bool,
    pub enabled: bool,
    pub extra_config: Option<Json>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<crate::entity::agent_config::Model> for AgentConfigResponse {
    fn from(model: crate::entity::agent_config::Model) -> Self {
        Self {
            id: model.id,
            agent_code: model.agent_code,
            name: model.name,
            description: model.description,
            llm_config_id: model.llm_config_id,
            custom_prompt: model.custom_prompt,
            use_system_prompt: model.use_system_prompt,
            enabled: model.enabled,
            extra_config: model.extra_config,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

/// 创建 Agent 配置请求
#[derive(Deserialize)]
pub struct CreateAgentConfigRequest {
    pub agent_code: String,
    pub name: String,
    pub description: Option<String>,
    pub llm_config_id: Option<i32>,
    pub custom_prompt: Option<String>,
    pub use_system_prompt: bool,
    pub extra_config: Option<Json>,
}

/// 更新 Agent 配置请求
#[derive(Deserialize)]
pub struct UpdateAgentConfigRequest {
    pub agent_code: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub llm_config_id: Option<i32>,
    pub custom_prompt: Option<String>,
    pub use_system_prompt: Option<bool>,
    pub enabled: Option<bool>,
    pub extra_config: Option<Json>,
}

/// 获取所有 Agent 配置
#[tauri::command]
pub async fn list_agent_configs(
    state: State<'_, AppState>,
) -> Result<Vec<AgentConfigResponse>, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.find_all()
        .await
        .map(|configs| configs.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

/// 获取启用的 Agent 配置
#[tauri::command]
pub async fn list_enabled_agent_configs(
    state: State<'_, AppState>,
) -> Result<Vec<AgentConfigResponse>, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.find_enabled()
        .await
        .map(|configs| configs.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

/// 获取单个 Agent 配置
#[tauri::command]
pub async fn get_agent_config(
    state: State<'_, AppState>,
    id: i32,
) -> Result<Option<AgentConfigResponse>, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.find_by_id(id)
        .await
        .map(|opt| opt.map(Into::into))
        .map_err(|e| e.to_string())
}

/// 根据 Agent Code 获取配置
#[tauri::command]
pub async fn get_agent_config_by_code(
    state: State<'_, AppState>,
    agent_code: String,
) -> Result<Option<AgentConfigResponse>, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.find_by_agent_code(&agent_code)
        .await
        .map(|opt| opt.map(Into::into))
        .map_err(|e| e.to_string())
}

/// 创建 Agent 配置
#[tauri::command]
pub async fn create_agent_config(
    state: State<'_, AppState>,
    req: CreateAgentConfigRequest,
) -> Result<AgentConfigResponse, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    let params = AgentConfigCreateParams {
        agent_code: req.agent_code,
        name: req.name,
        description: req.description,
        llm_config_id: req.llm_config_id,
        custom_prompt: req.custom_prompt,
        use_system_prompt: req.use_system_prompt,
        extra_config: req.extra_config,
    };
    repo.create(params)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 更新 Agent 配置
#[tauri::command]
pub async fn update_agent_config(
    state: State<'_, AppState>,
    id: i32,
    req: UpdateAgentConfigRequest,
) -> Result<AgentConfigResponse, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    let params = AgentConfigUpdateParams {
        agent_code: req.agent_code,
        name: req.name,
        description: req.description,
        llm_config_id: req.llm_config_id,
        custom_prompt: req.custom_prompt,
        use_system_prompt: req.use_system_prompt,
        enabled: req.enabled,
        extra_config: req.extra_config,
    };
    repo.update(id, params)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 删除 Agent 配置
#[tauri::command]
pub async fn delete_agent_config(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.delete(id).await.map_err(|e| e.to_string())
}

/// 启用 Agent 配置
#[tauri::command]
pub async fn enable_agent_config(
    state: State<'_, AppState>,
    id: i32,
) -> Result<AgentConfigResponse, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.enable(id)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 禁用 Agent 配置
#[tauri::command]
pub async fn disable_agent_config(
    state: State<'_, AppState>,
    id: i32,
) -> Result<AgentConfigResponse, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.disable(id)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 绑定 LLM 配置到 Agent
#[tauri::command]
pub async fn bind_llm_to_agent(
    state: State<'_, AppState>,
    id: i32,
    llm_config_id: Option<i32>,
) -> Result<AgentConfigResponse, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.bind_llm(id, llm_config_id)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 设置 Agent 自定义提示词
#[tauri::command]
pub async fn set_agent_custom_prompt(
    state: State<'_, AppState>,
    id: i32,
    custom_prompt: Option<String>,
) -> Result<AgentConfigResponse, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.set_custom_prompt(id, custom_prompt)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 初始化默认 Agent 配置
#[tauri::command]
pub async fn init_default_agent_configs(state: State<'_, AppState>) -> Result<(), String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.init_default_agents().await.map_err(|e| e.to_string())
}

/// 获取所有 Agent 类型定义
#[tauri::command]
pub fn get_agent_types() -> Vec<AgentTypeInfo> {
    vec![
        AgentTypeInfo {
            code: "novel_outline".to_string(),
            name: "小说大纲生成".to_string(),
            description:
                "根据用户输入的故事概念，生成详细的小说大纲，包括主要情节、角色设定和章节规划。"
                    .to_string(),
        },
        AgentTypeInfo {
            code: "chapter_timeline".to_string(),
            name: "章节时间线规划".to_string(),
            description: "根据大纲和上下文，规划章节的时间线和事件推进表。".to_string(),
        },
        AgentTypeInfo {
            code: "character_design".to_string(),
            name: "角色设计".to_string(),
            description: "帮助用户创建详细的角色档案，包括外貌、性格、背景故事等。".to_string(),
        },
        AgentTypeInfo {
            code: "chapter_content".to_string(),
            name: "章节内容生成".to_string(),
            description: "根据大纲和上下文，撰写小说章节内容，保持风格一致性和情节连贯性。"
                .to_string(),
        },
        AgentTypeInfo {
            code: "chapter_polish".to_string(),
            name: "章节润色优化".to_string(),
            description: "润色和优化章节内容，提升文笔和表达。".to_string(),
        },
    ]
}

/// Agent 类型信息
#[derive(Serialize)]
pub struct AgentTypeInfo {
    pub code: String,
    pub name: String,
    pub description: String,
}
