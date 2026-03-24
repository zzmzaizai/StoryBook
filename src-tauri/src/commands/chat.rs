//! Chat 命令模块
//!
//! 提供与 Agent 聊天的功能

use crate::ai::agent::factory::AgentService;
use crate::ai::agent::traits::{AgentContext, AgentExecutionContext};
use crate::ai::llm::service::LlmService;
use crate::commands::AppState;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;
use tauri::Emitter;

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

/// 流式聊天响应块
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChatChunk {
    /// 内容块
    pub content: String,
    /// 是否是最后一块
    pub is_done: bool,
}

/// 与 Agent 进行流式聊天
#[tauri::command]
pub async fn chat_with_agent_stream(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    agent_code: String,
    message: String,
    history: Option<Vec<ChatMessage>>,
) -> Result<(), String> {
    use crate::ai::llm::executor::LlmExecutor;
    use crate::ai::llm::types::LlmCompletionParams;

    // 获取 Agent handler
    let handler = AgentService::get_handler(&agent_code)
        .ok_or_else(|| format!("Agent not found: {}", agent_code))?;

    // 获取 Agent 配置
    let agent_config = AgentService::get_agent_config(&state.db, &agent_code)
        .await
        .map_err(|e| e.to_string())?;

    // 获取 LLM 配置
    let llm_config = LlmService::get_llm_for_agent(&state.db, agent_config.llm_config_id)
        .await
        .map_err(|e| e.to_string())?;

    // 构建执行上下文
    let exec_ctx = AgentExecutionContext::new(agent_config.get_effective_system_prompt().await);

    // 构建输入上下文
    let input = serde_json::json!({
        "message": message,
        "history": history.unwrap_or_default(),
    });
    let ctx = AgentContext::new(input);

    // 构建提示词
    let user_prompt = handler
        .build_user_prompt(ctx)
        .await
        .map_err(|e| e.to_string())?;
    let system_prompt = exec_ctx.merge_custom_prompt();

    // 创建事件名称
    let event_name = format!("chat-stream-{}", agent_code);

    // 创建执行器并执行流式调用
    let executor = LlmExecutor::from_config(&llm_config).map_err(|e| e.to_string())?;

    // 创建通道
    let (tx, mut rx) = tokio::sync::mpsc::channel::<crate::ai::llm::types::LlmStreamChunk>(100);

    // 在后台任务中执行流式调用
    let executor_clone = LlmExecutor::from_config(&llm_config).map_err(|e| e.to_string())?;
    let system_prompt_clone = system_prompt.clone();
    let user_prompt_clone = user_prompt.clone();

    tokio::spawn(async move {
        let _ = executor_clone
            .complete_stream(&system_prompt_clone, &user_prompt_clone, move |chunk| {
                let _ = tx.try_send(chunk);
            })
            .await;
    });

    // 接收流式数据并发送事件
    while let Some(chunk) = rx.recv().await {
        let chunk_data = StreamChatChunk {
            content: chunk.content,
            is_done: chunk.is_done,
        };
        let _ = app_handle.emit(&event_name, chunk_data);

        if chunk.is_done {
            break;
        }
    }

    Ok(())
}
