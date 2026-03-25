//! AI 模块
//!
//! 包含 LLM 和 Agent 的核心功能

pub mod agent;
pub mod llm;
pub mod prompts;

pub use agent::{AgentFactory, AgentService};
pub use crate::entity::agent_config::AgentCodes;
pub use llm::{LlmConfig, LlmExecutor};
