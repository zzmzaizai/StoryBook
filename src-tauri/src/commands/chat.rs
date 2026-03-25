//! Chat 命令模块
//!
//! 提供与 Agent 聊天的功能

use crate::ai::agent::factory::AgentService;
use crate::commands::AppState;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, State};
use tokio::sync::mpsc;

/// 聊天请求
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    /// Agent 代码
    pub agent_code: String,
    /// 用户消息
    pub message: String,
    /// 对话历史
    pub history: Option<Vec<ChatMessage>>,
}

/// 聊天消息
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    /// 角色 (user/assistant)
    pub role: String,
    /// 消息内容
    pub content: String,
}

/// 聊天响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    /// 回复内容
    pub content: String,
    /// 使用的 LLM 配置 ID
    pub llm_config_id: i32,
    /// 使用的提供商
    pub provider: String,
    /// 使用的模型
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStreamChunk {
    pub request_id: String,
    pub delta: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStreamDone {
    pub request_id: String,
    pub content: String,
    pub llm_config_id: i32,
    pub provider: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatStreamError {
    pub request_id: String,
    pub error: String,
}

/// 与 Agent 聊天
#[tauri::command]
pub async fn chat_with_agent(
    state: State<'_, AppState>,
    agent_code: String,
    message: String,
    history: Option<Vec<ChatMessage>>,
) -> Result<ChatResponse, String> {
    // 构建输入参数
    let input = serde_json::json!({
        "message": message,
        "history": history.unwrap_or_default(),
    });

    // 调用 Agent
    let result = AgentService::invoke(&state.db, &agent_code, input)
        .await
        .map_err(|e| e.to_string())?;

    Ok(ChatResponse {
        content: result.content,
        llm_config_id: result.llm_config_id,
        provider: result.provider,
        model: result.model,
    })
}

/// 使用指定 LLM 与 Agent 聊天
#[tauri::command]
pub async fn chat_with_agent_and_llm(
    state: State<'_, AppState>,
    agent_code: String,
    llm_config_id: i32,
    message: String,
    history: Option<Vec<ChatMessage>>,
) -> Result<ChatResponse, String> {
    // 构建输入参数
    let input = serde_json::json!({
        "message": message,
        "history": history.unwrap_or_default(),
    });

    // 调用 Agent
    let result = AgentService::invoke_with_llm(&state.db, &agent_code, llm_config_id, input)
        .await
        .map_err(|e| e.to_string())?;

    Ok(ChatResponse {
        content: result.content,
        llm_config_id: result.llm_config_id,
        provider: result.provider,
        model: result.model,
    })
}

/// 流式与 Agent 聊天
#[tauri::command]
pub async fn chat_with_agent_stream(
    app: AppHandle,
    state: State<'_, AppState>,
    request_id: String,
    agent_code: String,
    message: String,
    history: Option<Vec<ChatMessage>>,
) -> Result<(), String> {
    let input = serde_json::json!({
        "message": message,
        "history": history.unwrap_or_default(),
    });

    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let app_handle = app.clone();
    let request_id_for_chunks = request_id.clone();

    tauri::async_runtime::spawn(async move {
        while let Some(delta) = rx.recv().await {
            let _ = app_handle.emit(
                "chat-stream-chunk",
                ChatStreamChunk {
                    request_id: request_id_for_chunks.clone(),
                    delta,
                },
            );
        }
    });

    match AgentService::invoke_stream(&state.db, &agent_code, input, tx).await {
        Ok(result) => {
            app.emit(
                "chat-stream-done",
                ChatStreamDone {
                    request_id,
                    content: result.content,
                    llm_config_id: result.llm_config_id,
                    provider: result.provider,
                    model: result.model,
                },
            )
            .map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(err) => {
            app.emit(
                "chat-stream-error",
                ChatStreamError {
                    request_id,
                    error: err.to_string(),
                },
            )
            .map_err(|e| e.to_string())?;
            Err(err.to_string())
        }
    }
}
