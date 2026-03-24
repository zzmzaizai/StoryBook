/// 实体模块
/// 
/// 包含所有数据库实体定义和枚举类型

pub mod enums;
pub mod novels;
pub mod chapters;
pub mod characters;
pub mod novel_meta;
pub mod novel_settings;
pub mod novel_chapter_meta;
pub mod novel_chapter_history;
pub mod novel_chapter_version;
pub mod novel_chapter_timeline;
pub mod llm_config;
pub mod agent_config;

pub use enums::*;
