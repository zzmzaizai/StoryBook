//! Agent Handlers
//!
//! 每个 Agent 一个独立的 Handler 实现

mod chapter_content_handler;
mod chapter_timeline_handler;
mod character_design_handler;
mod general_chat_handler;
mod meta_generator_handler;
mod novel_info_generator_handler;
mod novel_outline_handler;

pub use chapter_content_handler::{ChapterContentHandler, ChapterContentInput};
pub use chapter_timeline_handler::{ChapterTimelineHandler, ChapterTimelineInput};
pub use character_design_handler::{CharacterDesignHandler, CharacterDesignInput};
pub use general_chat_handler::GeneralChatHandler;
pub use meta_generator_handler::{MetaGeneratorHandler, MetaGeneratorInput};
pub use novel_info_generator_handler::{
    GeneratedNovelInfo, NovelInfoGeneratorHandler, NovelInfoGeneratorInput,
};
pub use novel_outline_handler::NovelOutlineHandler;
