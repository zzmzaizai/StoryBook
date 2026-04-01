use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, serde::Serialize)]
pub struct AiPhaseEvent {
    pub request_id: String,
    pub agent_code: String,
    pub phase: String,
    pub message: Option<String>,
    pub timestamp_ms: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AiToolCallEvent {
    pub request_id: String,
    pub agent_code: String,
    pub phase: String,
    pub tool_name: String,
    pub args_summary: String,
    pub result_summary: Option<String>,
    pub duration_ms: Option<u64>,
    pub status: String,
    pub timestamp_ms: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AiGenerationDoneEvent {
    pub request_id: String,
    pub agent_code: String,
    pub message: Option<String>,
    pub timestamp_ms: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AiGenerationErrorEvent {
    pub request_id: String,
    pub agent_code: String,
    pub error: String,
    pub timestamp_ms: u64,
}

pub fn emit_phase_start(
    app: &AppHandle,
    namespace: &str,
    request_id: &str,
    agent_code: &str,
    phase: &str,
    message: Option<String>,
) {
    let _ = app.emit(
        &format!("{}-ai-phase-start", namespace),
        AiPhaseEvent {
            request_id: request_id.to_string(),
            agent_code: agent_code.to_string(),
            phase: phase.to_string(),
            message,
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

pub fn emit_phase_end(
    app: &AppHandle,
    namespace: &str,
    request_id: &str,
    agent_code: &str,
    phase: &str,
    message: Option<String>,
) {
    let _ = app.emit(
        &format!("{}-ai-phase-end", namespace),
        AiPhaseEvent {
            request_id: request_id.to_string(),
            agent_code: agent_code.to_string(),
            phase: phase.to_string(),
            message,
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

pub fn emit_tool_call_start(
    app: &AppHandle,
    namespace: &str,
    request_id: &str,
    agent_code: &str,
    phase: &str,
    tool_name: &str,
    args_summary: String,
) {
    let _ = app.emit(
        &format!("{}-ai-tool-call-start", namespace),
        AiToolCallEvent {
            request_id: request_id.to_string(),
            agent_code: agent_code.to_string(),
            phase: phase.to_string(),
            tool_name: tool_name.to_string(),
            args_summary,
            result_summary: None,
            duration_ms: None,
            status: "started".to_string(),
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

#[allow(clippy::too_many_arguments)]
pub fn emit_tool_call_result(
    app: &AppHandle,
    namespace: &str,
    request_id: &str,
    agent_code: &str,
    phase: &str,
    tool_name: &str,
    args_summary: String,
    result_summary: String,
    duration_ms: Option<u64>,
    status: &str,
) {
    let _ = app.emit(
        &format!("{}-ai-tool-call-result", namespace),
        AiToolCallEvent {
            request_id: request_id.to_string(),
            agent_code: agent_code.to_string(),
            phase: phase.to_string(),
            tool_name: tool_name.to_string(),
            args_summary,
            result_summary: Some(result_summary),
            duration_ms,
            status: status.to_string(),
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

pub fn emit_generation_done(
    app: &AppHandle,
    namespace: &str,
    request_id: &str,
    agent_code: &str,
    message: Option<String>,
) {
    let _ = app.emit(
        &format!("{}-ai-generation-done", namespace),
        AiGenerationDoneEvent {
            request_id: request_id.to_string(),
            agent_code: agent_code.to_string(),
            message,
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

pub fn emit_generation_error(
    app: &AppHandle,
    namespace: &str,
    request_id: &str,
    agent_code: &str,
    error: impl Into<String>,
) {
    let _ = app.emit(
        &format!("{}-ai-generation-error", namespace),
        AiGenerationErrorEvent {
            request_id: request_id.to_string(),
            agent_code: agent_code.to_string(),
            error: error.into(),
            timestamp_ms: now_timestamp_ms(),
        },
    );
}

pub fn now_timestamp_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}
