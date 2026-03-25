//! Chat 命令模块
//!
//! 提供与 Agent 聊天的功能

use crate::ai::agent::factory::AgentService;
use crate::ai::agent::traits::{AgentContext, AgentExecutionContext};
use crate::ai::llm::{LlmExecutor, StreamChunk};
use crate::ai::llm::service::LlmService;
use crate::commands::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri::Emitter;

/// 聊天请求
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub agent_code: String,
    pub message: String,
    pub history: Option<Vec<ChatMessage>>,
}

/// 聊天消息
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// 聊天响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub llm_config_id: i32,
    pub provider: String,
    pub model: String,
}

#[tauri::command]
pub async fn chat_with_agent(
    state: State<'_, AppState>,
    agent_code: String,
    message: String,
    history: Option<Vec<ChatMessage>>,
) -> Result<ChatResponse, String> {
    let input = serde_json::json!({
        "message": message,
        "history": history.unwrap_or_default(),
    });

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

#[tauri::command]
pub async fn chat_with_agent_and_llm(
    state: State<'_, AppState>,
    agent_code: String,
    llm_config_id: i32,
    message: String,
    history: Option<Vec<ChatMessage>>,
) -> Result<ChatResponse, String> {
    let input = serde_json::json!({
        "message": message,
        "history": history.unwrap_or_default(),
    });

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChatChunk {
    pub kind: String,
    pub content: String,
    pub is_done: bool,
    pub usage: Option<crate::ai::llm::TokenUsage>,
}

#[tauri::command]
pub async fn chat_with_agent_stream(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    agent_code: String,
    message: String,
    history: Option<Vec<ChatMessage>>,
) -> Result<(), String> {
    let handler = AgentService::get_handler(&agent_code)
        .ok_or_else(|| format!("Agent not found: {}", agent_code))?;

    let agent_config = AgentService::get_agent_config(&state.db, &agent_code)
        .await
        .map_err(|e| e.to_string())?;

    let llm_config = LlmService::get_llm_for_agent(&state.db, agent_config.llm_config_id)
        .await
        .map_err(|e| e.to_string())?;

    let system_prompt = if agent_config.use_system_prompt {
        crate::ai::prompts::load_prompt(&agent_code)
            .await
            .map_err(|e| e.to_string())?
    } else {
        String::new()
    };

    let mut exec_ctx = AgentExecutionContext::new(system_prompt);
    if let Some(ref custom) = agent_config.custom_prompt {
        exec_ctx = exec_ctx.with_custom_prompt(custom);
    }

    let input = serde_json::json!({
        "message": message,
        "history": history.unwrap_or_default(),
    });
    let ctx = AgentContext::new(input);

    let user_prompt = handler
        .build_user_prompt(ctx)
        .await
        .map_err(|e| e.to_string())?;
    let system_prompt = exec_ctx.merge_prompts();

    let event_name = format!("chat-stream-{}", agent_code);

    let (tx, mut rx) = tokio::sync::mpsc::channel::<StreamChunk>(100);

    let executor_clone = LlmExecutor::from_db_config(&llm_config).map_err(|e| e.to_string())?;
    let system_prompt_clone = system_prompt.clone();
    let user_prompt_clone = user_prompt.clone();

    tokio::spawn(async move {
        let _ = executor_clone
            .complete_stream_channel(&system_prompt_clone, &user_prompt_clone, tx)
            .await;
    });

    while let Some(chunk) = rx.recv().await {
        let chunk_data = StreamChatChunk {
            kind: chunk.kind,
            content: chunk.content,
            is_done: chunk.is_done,
            usage: chunk.usage,
        };
        let _ = app_handle.emit(&event_name, chunk_data);

        if chunk.is_done {
            break;
        }
    }

    Ok(())
}
