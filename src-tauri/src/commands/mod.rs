pub mod agent_config;
pub mod chapters;
pub mod characters;
pub mod chat;
pub mod llm_config;
pub mod meta;
pub mod novels;
pub mod timeline;

pub use agent_config::*;
pub use chapters::*;
pub use characters::*;
pub use chat::*;
pub use llm_config::*;
pub use meta::*;
pub use novels::*;
pub use timeline::*;

use crate::repository::{
    AgentConfigRepository, ChapterRepository, CharacterRepository, LlmConfigRepository,
    MetaRepository, NovelRepository, TimelineRepository,
};
use sea_orm::DatabaseConnection;
use std::sync::Arc;

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

    #[allow(dead_code)]
    pub fn llm_configs(&self) -> LlmConfigRepository {
        LlmConfigRepository::new(self.db.clone())
    }

    #[allow(dead_code)]
    pub fn agent_configs(&self) -> AgentConfigRepository {
        AgentConfigRepository::new(self.db.clone())
    }
}
