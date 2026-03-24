//! Agent 注册表
//!
//! 管理所有 Agent 的注册和查找

use crate::ai::agent::handlers::*;
use crate::ai::agent::traits::AgentHandler;
use std::collections::HashMap;
use std::sync::Arc;

/// Agent 注册表
///
/// 存储所有可用的 Agent Handler
pub struct AgentRegistry {
    handlers: HashMap<String, Arc<dyn AgentHandler>>,
}

impl AgentRegistry {
    /// 创建新的注册表并注册所有内置 Agent
    pub fn new() -> Self {
        let mut registry = Self {
            handlers: HashMap::new(),
        };
        registry.register_builtin_agents();
        registry
    }

    /// 注册内置 Agent
    fn register_builtin_agents(&mut self) {
        // 注册通用聊天 Agent（默认）
        self.register(Arc::new(GeneralChatHandler));

        // 注册小说大纲 Agent
        self.register(Arc::new(NovelOutlineHandler));

        // 注册章节时间线 Agent
        self.register(Arc::new(ChapterTimelineHandler));

        // 注册角色设计 Agent
        self.register(Arc::new(CharacterDesignHandler));
    }

    /// 注册 Agent
    pub fn register(&mut self, handler: Arc<dyn AgentHandler>) {
        let code = handler.code().to_string();
        self.handlers.insert(code, handler);
    }

    /// 根据代码获取 Agent Handler
    pub fn get(&self, agent_code: &str) -> Option<Arc<dyn AgentHandler>> {
        self.handlers.get(agent_code).cloned()
    }

    /// 检查 Agent 是否存在
    pub fn has(&self, agent_code: &str) -> bool {
        self.handlers.contains_key(agent_code)
    }

    /// 获取所有 Agent 代码列表
    pub fn list_codes(&self) -> Vec<String> {
        self.handlers.keys().cloned().collect()
    }

    /// 获取所有 Agent Handler
    pub fn list_handlers(&self) -> Vec<Arc<dyn AgentHandler>> {
        self.handlers.values().cloned().collect()
    }
}

impl Default for AgentRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// 获取 Agent Handler（便捷函数）
///
/// 创建临时注册表并查找 Agent
pub fn get_agent_handler(agent_code: &str) -> Option<Arc<dyn AgentHandler>> {
    let registry = AgentRegistry::new();
    registry.get(agent_code)
}

/// Agent 代码常量
pub struct AgentCodes;

impl AgentCodes {
    /// 通用聊天 Agent（默认）
    pub const GENERAL_CHAT: &'static str = "general_chat";
    /// 小说大纲 Agent
    pub const NOVEL_OUTLINE: &'static str = "novel_outline";
    /// 章节时间线 Agent
    pub const CHAPTER_TIMELINE: &'static str = "chapter_timeline";
    /// 角色设计 Agent
    pub const CHARACTER_DESIGN: &'static str = "character_design";
}
