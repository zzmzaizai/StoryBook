use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use rig::agent::{HookAction, PromptHook, ToolCallHookAction};
use rig::completion::CompletionModel;
use tauri::AppHandle;

use crate::ai::events::{emit_tool_call_result, emit_tool_call_start};

#[derive(Clone)]
pub struct AiHookContext {
    pub app: AppHandle,
    pub event_namespace: String,
    pub request_id: String,
    pub agent_code: String,
    pub phase: String,
}

#[derive(Clone)]
pub struct ObservedToolHook {
    context: AiHookContext,
    started_at: Arc<Mutex<HashMap<String, Instant>>>,
}

impl ObservedToolHook {
    pub fn new(context: AiHookContext) -> Self {
        Self {
            context,
            started_at: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl<M> PromptHook<M> for ObservedToolHook
where
    M: CompletionModel,
{
    async fn on_tool_call(
        &self,
        tool_name: &str,
        _tool_call_id: Option<String>,
        internal_call_id: &str,
        args: &str,
    ) -> ToolCallHookAction {
        if tool_name == "submit" {
            return ToolCallHookAction::cont();
        }

        if let Ok(mut started_at) = self.started_at.lock() {
            started_at.insert(internal_call_id.to_string(), Instant::now());
        }

        emit_tool_call_start(
            &self.context.app,
            &self.context.event_namespace,
            &self.context.request_id,
            &self.context.agent_code,
            &self.context.phase,
            tool_name,
            summarize_json(args),
        );

        ToolCallHookAction::cont()
    }

    async fn on_tool_result(
        &self,
        tool_name: &str,
        _tool_call_id: Option<String>,
        internal_call_id: &str,
        args: &str,
        result: &str,
    ) -> HookAction {
        if tool_name == "submit" {
            return HookAction::cont();
        }

        let duration_ms = self
            .started_at
            .lock()
            .ok()
            .and_then(|mut started_at| started_at.remove(internal_call_id))
            .map(|start| start.elapsed().as_millis() as u64);

        emit_tool_call_result(
            &self.context.app,
            &self.context.event_namespace,
            &self.context.request_id,
            &self.context.agent_code,
            &self.context.phase,
            tool_name,
            summarize_json(args),
            summarize_tool_result(result),
            duration_ms,
            "finished",
        );

        HookAction::cont()
    }
}

fn summarize_tool_result(result: &str) -> String {
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(result) {
        if let Some(summary) = value.get("summary").and_then(|item| item.as_str()) {
            return truncate(summary, 160);
        }
        return truncate_compact_json(&value, 160);
    }

    truncate(result, 160)
}

fn summarize_json(input: &str) -> String {
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(input) {
        return truncate_compact_json(&value, 120);
    }

    truncate(input, 120)
}

fn truncate_compact_json(value: &serde_json::Value, limit: usize) -> String {
    truncate(&value.to_string(), limit)
}

fn truncate(input: &str, limit: usize) -> String {
    let compact = input.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut chars = compact.chars();
    let shortened: String = chars.by_ref().take(limit).collect();
    if chars.next().is_some() {
        format!("{}...", shortened)
    } else {
        shortened
    }
}
