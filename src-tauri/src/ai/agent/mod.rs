//! Agent 模块
//!
//! 负责 Agent 的创建、管理和执行

pub mod factory;
pub mod handlers;
pub mod registry;
pub mod service;
pub mod tools;
pub mod traits;

pub use factory::{AgentFactory, AgentService};
pub use crate::entity::agent_config::AgentCodes;
pub use service::{AgentBizService, ChapterTimelineParams, CharacterDesignParams, GeneralChatParams, NovelOutlineParams};
pub use traits::{AgentContext, AgentExecutionContext, AgentHandler, AgentResult, ChatMessage, TypedAgentHandler};
