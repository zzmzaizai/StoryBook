use crate::ai::structured::StructuredGenerationOptions;

pub const TIMELINE_AI_TIMEOUT_SECS: u64 = 900;
pub const NOVEL_INFO_AI_TIMEOUT_SECS: u64 = 300;
pub const CHARACTER_AI_TIMEOUT_SECS: u64 = 420;

pub const TIMELINE_STRUCTURED_RETRIES: u64 = 1;
pub const NOVEL_INFO_STRUCTURED_RETRIES: u64 = 1;
pub const CHARACTER_STRUCTURED_RETRIES: u64 = 1;

pub const fn timeline_generation_options() -> StructuredGenerationOptions {
    StructuredGenerationOptions::new(Some(TIMELINE_AI_TIMEOUT_SECS), TIMELINE_STRUCTURED_RETRIES)
}

pub const fn novel_info_generation_options() -> StructuredGenerationOptions {
    StructuredGenerationOptions::new(
        Some(NOVEL_INFO_AI_TIMEOUT_SECS),
        NOVEL_INFO_STRUCTURED_RETRIES,
    )
}

pub const fn character_generation_options() -> StructuredGenerationOptions {
    StructuredGenerationOptions::new(
        Some(CHARACTER_AI_TIMEOUT_SECS),
        CHARACTER_STRUCTURED_RETRIES,
    )
}
