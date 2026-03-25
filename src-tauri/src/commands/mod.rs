pub mod novels;
pub mod chapters;
pub mod characters;
pub mod timeline;
pub mod meta;
pub mod llm_config;
pub mod agent_config;
pub mod chat;

pub use novels::*;
pub use chapters::*;
pub use characters::*;
pub use timeline::*;
pub use meta::*;
pub use llm_config::*;
pub use agent_config::*;
pub use chat::*;

use std::sync::Arc;
use sea_orm::DatabaseConnection;
use crate::repository::{NovelRepository, ChapterRepository, CharacterRepository, TimelineRepository, MetaRepository, LlmConfigRepository, AgentConfigRepository};

pub struct AppState {
    pub db: Arc<DatabaseConnection>,
}

impl AppState {
    pub fn novels(&self) -> NovelRepository {
        NovelRepository::new(self.db.clone())
    }

    pub fn chapters(&self) -> ChapterRepository {
        ChapterRepository::new(self.db.clone())
    }

    pub fn characters(&self) -> CharacterRepository {
        CharacterRepository::new(self.db.clone())
    }

    pub fn timelines(&self) -> TimelineRepository {
        TimelineRepository::new(self.db.clone())
    }

    pub fn meta(&self) -> MetaRepository {
        MetaRepository::new(self.db.clone())
    }

    pub fn llm_configs(&self) -> LlmConfigRepository {
        LlmConfigRepository::new(self.db.clone())
    }

    pub fn agent_configs(&self) -> AgentConfigRepository {
        AgentConfigRepository::new(self.db.clone())
    }

    pub fn db(&self) -> &DatabaseConnection {
        &self.db
    }
}
