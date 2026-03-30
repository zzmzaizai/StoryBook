//! 时间线正文 Agent Handler
//!
//! 负责生成时间线标题与正文

use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use serde::Deserialize;

/// 章节时间线输入参数
#[derive(Debug, Deserialize)]
struct ChapterTimelineInput {
    outline: String,
    chapter_start: u32,
    chapter_end: u32,
    current_arc_goal: Option<String>,
}

/// 时间线正文 Agent Handler
pub struct ChapterTimelineHandler;

#[async_trait]
impl AgentHandler for ChapterTimelineHandler {
    fn code(&self) -> &'static str {
        "chapter_timeline"
    }

    fn name(&self) -> &'static str {
        "时间线正文生成"
    }

    fn description(&self) -> &'static str {
        "根据小说大纲和当前章节范围，生成时间线标题与正文"
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: ChapterTimelineInput = serde_json::from_value(ctx.input)?;

        let prompt = format!(
            r#"请基于以下小说大纲，为第 {} 到第 {} 章生成一个时间线方案。

小说大纲：
{}

当前篇章目标：
{}

请只输出适合作家继续创作的时间线正文，不要解释，不要写多余前言。
正文应包含这一段章节范围内的核心推进、关键事件、冲突演进、重要人物作用和节奏安排。"#,
            input.chapter_start,
            input.chapter_end,
            input.outline,
            input.current_arc_goal.unwrap_or_default()
        );

        Ok(prompt)
    }
}
