//! 章节时间线 Agent Handler
//!
//! 负责生成章节时间线规划

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

/// 章节时间线 Agent Handler
pub struct ChapterTimelineHandler;

#[async_trait]
impl AgentHandler for ChapterTimelineHandler {
    fn code(&self) -> &'static str {
        "chapter_timeline"
    }

    fn name(&self) -> &'static str {
        "章节时间线规划"
    }

    fn description(&self) -> &'static str {
        "根据小说大纲和当前章节范围，生成详细的章节时间线与事件推进表"
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: ChapterTimelineInput = serde_json::from_value(ctx.input)?;

        let prompt = format!(
            r#"请基于以下小说大纲，为第 {} 到第 {} 章生成章节时间线。

小说大纲：
{}

当前篇章目标：
{}

请输出表格化内容，每章包含：
1. 章节号
2. 时间点/时间推进
3. 核心事件
4. 冲突推进
5. 人物状态变化
6. 伏笔/回收"#,
            input.chapter_start,
            input.chapter_end,
            input.outline,
            input.current_arc_goal.unwrap_or_default()
        );

        Ok(prompt)
    }
}
