use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Default)]
pub struct ToolRequestCache {
    inner: Arc<Mutex<HashMap<String, HashSet<String>>>>,
}

impl ToolRequestCache {
    pub fn mark_seen(&self, tool_name: &str, key: String) -> bool {
        if let Ok(mut inner) = self.inner.lock() {
            let set = inner.entry(tool_name.to_string()).or_default();
            if set.contains(&key) {
                return true;
            }
            set.insert(key);
        }
        false
    }
}
