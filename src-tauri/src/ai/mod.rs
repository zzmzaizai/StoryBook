//! AI 模块
//!
//! 包含 LLM 和 Agent 的核心功能：
//! - LLM 工厂类：统一创建不同 provider 的 LLM 客户端
//! - Agent 工厂类：统一创建和管理 Agent 实例
//! - 提示词配置：每个 Agent 独立的默认提示词文件

pub mod agent;
pub mod llm;
pub mod prompts;
