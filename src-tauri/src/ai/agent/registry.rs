//! Agent 注册表
//!
//! 管理所有 Agent 的注册和查找

use crate::ai::agent::handlers::*;
use crate::ai::agent::traits::AgentHandler;
use std::collections::HashMap;
use std::sync::Arc;

/// Agent 注册表
pub struct AgentRegistry {
    handlers: HashMap<String, Arc<dyn AgentHandler>>,
}

impl AgentRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            handlers: HashMap::new(),
        };
        registry.register_builtin_agents();
        registry
    }

    fn register_builtin_agents(&mut self) {
        self.register(Arc::new(GeneralChatHandler));
        self.register(Arc::new(NovelOutlineHandler));
        self.register(Arc::new(ChapterTimelineHandler));
        self.register(Arc::new(CharacterDesignHandler));
    }

    pub fn register(&mut self, handler: Arc<dyn AgentHandler>) {
        let code = handler.code().to_string();
        self.handlers.insert(code, handler);
    }

    pub fn get(&self, agent_code: &str) -> Option<Arc<dyn AgentHandler>> {
        self.handlers.get(agent_code).cloned()
    }

    pub fn has(&self, agent_code: &str) -> bool {
        self.handlers.contains_key(agent_code)
    }

    pub fn list_codes(&self) -> Vec<String> {
        self.handlers.keys().cloned().collect()
    }

    pub fn list_handlers(&self) -> Vec<Arc<dyn AgentHandler>> {
        self.handlers.values().cloned().collect()
    }
}

impl Default for AgentRegistry {
    fn default() -> Self {
        Self::new()
    }
}

pub fn get_agent_handler(agent_code: &str) -> Option<Arc<dyn AgentHandler>> {
    let registry = AgentRegistry::new();
    registry.get(agent_code)
}
