//! Agent Handlers
//!
//! 每个 Agent 一个独立的 Handler 实现

mod chapter_timeline_handler;
mod character_design_handler;
mod general_chat_handler;
mod novel_info_generator_handler;
mod novel_outline_handler;

pub use chapter_timeline_handler::ChapterTimelineHandler;
pub use character_design_handler::CharacterDesignHandler;
pub use general_chat_handler::GeneralChatHandler;
pub use novel_info_generator_handler::{GeneratedNovelInfo, NovelInfoGeneratorHandler};
pub use novel_outline_handler::NovelOutlineHandler;
