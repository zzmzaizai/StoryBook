//! LLM 模块
//!
//! 提供统一的 LLM 调用接口

mod factory;
mod types;

pub mod executor;
pub mod service;

pub use executor::{LlmExecutor, LlmExecutorBuilder};
pub use types::{CompletionResult, LlmConfig, LlmProvider, StreamChunk, TokenUsage};
