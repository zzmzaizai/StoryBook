//! 时间线正文 Agent Handler
//!
//! 负责生成时间线标题与正文

use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

/// 章节时间线输入参数
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChapterTimelineInput {
    pub novel_context: String,
    pub metas_context: String,
    pub previous_timelines: String,
    pub chapter_start: u32,
    pub chapter_end: u32,
    pub current_context: String,
    pub requirement: Option<String>,
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

    async fn build_prompt_params(
        &self,
        ctx: &AgentContext,
    ) -> anyhow::Result<Option<serde_json::Value>> {
        Ok(Some(serde_json::to_value(
            ctx.parse::<ChapterTimelineInput>()?,
        )?))
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: ChapterTimelineInput = ctx.parse()?;
        let metas_context = if input.metas_context.trim().is_empty() {
            "（暂无）"
        } else {
            input.metas_context.trim()
        };
        let previous_timelines = if input.previous_timelines.trim().is_empty() {
            "（暂无）"
        } else {
            input.previous_timelines.trim()
        };
        let requirement = input
            .requirement
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("（无额外要求）");

        let prompt = format!(
            r#"当前正在编辑的时间线章节范围：第 {} 到第 {} 章。

小说基础信息：
{}

小说元数据上下文：
{}

其他已生成好的小说时间线（最多往前20条）：
{}

补充要求：
{}

当前任务：
{}

请围绕当前章节范围产出时间线结果。
- 标题必须准确概括这一段剧情推进。
- 正文必须服务于作者继续写作，使用 Markdown 组织内容。
- 正文需要体现核心目标、关键推进、冲突变化、人物作用和结尾钩子。
- 不要越界写到其他章节，也不要脱离已有元数据和前文连续性。"#,
            input.chapter_start,
            input.chapter_end,
            input.novel_context,
            metas_context,
            previous_timelines,
            requirement,
            input.current_context,
        );

        Ok(prompt)
    }
}
