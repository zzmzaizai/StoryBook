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
    pub extra_config: Option<Json>,
    pub builtin: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<crate::entity::agent_config::Model> for AgentConfigResponse {
    fn from(model: crate::entity::agent_config::Model) -> Self {
        let builtin = crate::entity::agent_config::AgentCodes::is_builtin(&model.agent_code);
        Self {
            id: model.id,
            agent_code: model.agent_code,
            name: model.name,
            description: model.description,
            llm_config_id: model.llm_config_id,
            custom_prompt: model.custom_prompt,
            use_system_prompt: model.use_system_prompt,
            extra_config: model.extra_config,
            builtin,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

#[derive(Serialize)]
pub struct AgentPromptDetails {
    pub agent_code: String,
    pub system_prompt: String,
    pub custom_prompt: Option<String>,
    pub use_system_prompt: bool,
    pub effective_prompt: String,
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
    pub description: Option<Option<String>>,
    pub llm_config_id: Option<Option<i32>>,
    pub custom_prompt: Option<Option<String>>,
    pub use_system_prompt: Option<bool>,
    pub extra_config: Option<Option<Json>>,
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

#[tauri::command]
pub async fn reset_builtin_agent_config(
    state: State<'_, AppState>,
    id: i32,
) -> Result<AgentConfigResponse, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    repo.reset_builtin_agent(id)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_agent_prompt_details(
    state: State<'_, AppState>,
    agent_code: String,
) -> Result<AgentPromptDetails, String> {
    let repo = AgentConfigRepository::new(state.db.clone());
    let config = repo
        .find_by_agent_code(&agent_code)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Agent 配置不存在: {}", agent_code))?;

    let system_prompt = crate::ai::prompts::load_prompt(&agent_code)
        .await
        .map_err(|e| e.to_string())?;
    let effective_prompt = match config.use_system_prompt {
        true => system_prompt.clone(),
        false => config
            .custom_prompt
            .as_deref()
            .map(str::trim)
            .unwrap_or("")
            .to_string(),
    };

    Ok(AgentPromptDetails {
        agent_code,
        system_prompt,
        custom_prompt: config.custom_prompt,
        use_system_prompt: config.use_system_prompt,
        effective_prompt,
    })
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
            code: "general_chat".to_string(),
            name: "通用助手".to_string(),
            description: "用于通用聊天问答与上下文咨询。".to_string(),
        },
        AgentTypeInfo {
            code: "novel_info_generator".to_string(),
            name: "小说基础信息生成".to_string(),
            description: "根据用户要求生成小说标题、简介、风格和预估规模等基础信息。".to_string(),
        },
        AgentTypeInfo {
            code: "novel_outline".to_string(),
            name: "小说大纲生成".to_string(),
            description:
                "根据用户输入的故事概念，生成详细的小说大纲，包括主要情节、角色设定和章节规划。"
                    .to_string(),
        },
        AgentTypeInfo {
            code: "chapter_timeline".to_string(),
            name: "时间线正文生成".to_string(),
            description: "根据大纲和上下文，生成或改写时间线标题与正文。".to_string(),
        },
        AgentTypeInfo {
            code: "character_design".to_string(),
            name: "角色设计".to_string(),
            description: "帮助用户创建详细的角色档案，包括外貌、性格、背景故事等。".to_string(),
        },
        AgentTypeInfo {
            code: "meta_generator".to_string(),
            name: "小说元数据生成".to_string(),
            description: "根据小说基础设定与上下文生成或改写单项元数据。".to_string(),
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
