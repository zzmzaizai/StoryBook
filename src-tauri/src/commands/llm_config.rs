//! LLM 配置 Commands
//!
//! 提供 LLM 配置的增删改查接口，供前端调用。

use sea_orm::prelude::Json;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::commands::AppState;
use crate::repository::{LlmConfigCreateParams, LlmConfigRepository, LlmConfigUpdateParams};

/// LLM 配置响应体
#[derive(Serialize)]
pub struct LlmConfigResponse {
    pub id: i32,
    pub name: String,
    pub provider: String,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub extra_config: Option<Json>,
    pub is_default: bool,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<crate::entity::llm_config::Model> for LlmConfigResponse {
    fn from(model: crate::entity::llm_config::Model) -> Self {
        Self {
            id: model.id,
            name: model.name,
            provider: model.provider,
            model: model.model,
            api_key: model.api_key,
            base_url: model.base_url,
            extra_config: model.extra_config,
            is_default: model.is_default,
            enabled: model.enabled,
            created_at: model.created_at,
            updated_at: model.updated_at,
        }
    }
}

/// 创建 LLM 配置请求
#[derive(Deserialize)]
pub struct CreateLlmConfigRequest {
    pub name: String,
    pub provider: String,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub extra_config: Option<Json>,
    pub is_default: bool,
}

/// 更新 LLM 配置请求
#[derive(Deserialize)]
pub struct UpdateLlmConfigRequest {
    pub name: Option<String>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub extra_config: Option<Json>,
    pub is_default: Option<bool>,
    pub enabled: Option<bool>,
}

/// 获取所有 LLM 配置
#[tauri::command]
pub async fn list_llm_configs(
    state: State<'_, AppState>,
) -> Result<Vec<LlmConfigResponse>, String> {
    let repo = LlmConfigRepository::new(state.db.clone());
    repo.find_all()
        .await
        .map(|configs| configs.into_iter().map(Into::into).collect())
        .map_err(|e| e.to_string())
}

/// 获取单个 LLM 配置
#[tauri::command]
pub async fn get_llm_config(
    state: State<'_, AppState>,
    id: i32,
) -> Result<Option<LlmConfigResponse>, String> {
    let repo = LlmConfigRepository::new(state.db.clone());
    repo.find_by_id(id)
        .await
        .map(|opt| opt.map(Into::into))
        .map_err(|e| e.to_string())
}

/// 获取默认 LLM 配置
#[tauri::command]
pub async fn get_default_llm_config(
    state: State<'_, AppState>,
) -> Result<Option<LlmConfigResponse>, String> {
    let repo = LlmConfigRepository::new(state.db.clone());
    repo.find_default()
        .await
        .map(|opt| opt.map(Into::into))
        .map_err(|e| e.to_string())
}

/// 创建 LLM 配置
#[tauri::command]
pub async fn create_llm_config(
    state: State<'_, AppState>,
    req: CreateLlmConfigRequest,
) -> Result<LlmConfigResponse, String> {
    let repo = LlmConfigRepository::new(state.db.clone());
    let params = LlmConfigCreateParams {
        name: req.name,
        provider: req.provider,
        model: req.model,
        api_key: req.api_key,
        base_url: req.base_url,
        extra_config: req.extra_config,
        is_default: req.is_default,
    };
    repo.create(params)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 更新 LLM 配置
#[tauri::command]
pub async fn update_llm_config(
    state: State<'_, AppState>,
    id: i32,
    req: UpdateLlmConfigRequest,
) -> Result<LlmConfigResponse, String> {
    let repo = LlmConfigRepository::new(state.db.clone());
    let params = LlmConfigUpdateParams {
        name: req.name,
        provider: req.provider,
        model: req.model,
        api_key: req.api_key,
        base_url: req.base_url,
        extra_config: req.extra_config,
        is_default: req.is_default,
        enabled: req.enabled,
    };
    repo.update(id, params)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 删除 LLM 配置
#[tauri::command]
pub async fn delete_llm_config(state: State<'_, AppState>, id: i32) -> Result<(), String> {
    let repo = LlmConfigRepository::new(state.db.clone());
    repo.delete(id).await.map_err(|e| e.to_string())
}

/// 设置默认 LLM 配置
#[tauri::command]
pub async fn set_default_llm_config(
    state: State<'_, AppState>,
    id: i32,
) -> Result<LlmConfigResponse, String> {
    let repo = LlmConfigRepository::new(state.db.clone());
    repo.set_default(id)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 启用 LLM 配置
#[tauri::command]
pub async fn enable_llm_config(
    state: State<'_, AppState>,
    id: i32,
) -> Result<LlmConfigResponse, String> {
    let repo = LlmConfigRepository::new(state.db.clone());
    repo.enable(id)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}

/// 禁用 LLM 配置
#[tauri::command]
pub async fn disable_llm_config(
    state: State<'_, AppState>,
    id: i32,
) -> Result<LlmConfigResponse, String> {
    let repo = LlmConfigRepository::new(state.db.clone());
    repo.disable(id)
        .await
        .map(Into::into)
        .map_err(|e| e.to_string())
}
