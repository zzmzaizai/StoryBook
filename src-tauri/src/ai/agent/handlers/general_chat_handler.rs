//! 通用聊天 Agent Handler
//!
//! 负责处理普通对话聊天

use crate::ai::agent::traits::{AgentContext, AgentHandler, ChatMessage};
use async_trait::async_trait;
use schemars::JsonSchema;
use serde::Deserialize;

/// 通用聊天输入参数
#[derive(Debug, Deserialize, JsonSchema)]
pub struct GeneralChatInput {
    #[doc = "User message"]
    pub message: String,
    #[doc = "Chat history"]
    pub history: Option<Vec<ChatMessage>>,
    #[doc = "Additional context"]
    pub context: Option<String>,
}

/// 通用聊天 Agent Handler
pub struct GeneralChatHandler;

#[async_trait]
impl AgentHandler for GeneralChatHandler {
    fn code(&self) -> &'static str {
        "general_chat"
    }

    fn name(&self) -> &'static str {
        "通用助手"
    }

    fn description(&self) -> &'static str {
        "一个通用的 AI 助手，可以回答各种问题、进行对话和提供建议"
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: GeneralChatInput = ctx.parse()?;

        let history_context = if let Some(history) = input.history {
            if history.is_empty() {
                String::new()
            } else {
                let history_str = history
                    .iter()
                    .map(|msg| format!("{}: {}", msg.role, msg.content))
                    .collect::<Vec<_>>()
                    .join("\n");
                format!("\n\n对话历史：\n{}", history_str)
            }
        } else {
            String::new()
        };

        let extra_context = if let Some(context) = input.context {
            format!("\n\n相关上下文：\n{}", context)
        } else {
            String::new()
        };

        let prompt = format!("{}{}{}", input.message, history_context, extra_context);

        Ok(prompt)
    }
}
