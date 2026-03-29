use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct ChapterContentInput {
    novel_context: String,
    meta_context: Option<String>,
    related_timeline_context: String,
    previous_chapters_context: Option<String>,
    chapter_context: String,
    requirement: String,
    mode_instruction: String,
}

pub struct ChapterContentHandler;

#[async_trait]
impl AgentHandler for ChapterContentHandler {
    fn code(&self) -> &'static str {
        "chapter_content"
    }

    fn name(&self) -> &'static str {
        "章节内容生成"
    }

    fn description(&self) -> &'static str {
        "结合时间线和前文上下文生成、扩写、续写章节正文。"
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: ChapterContentInput = ctx.parse()?;

        Ok(format!(
            "{}\n\n其他已生成元数据：\n{}\n\n{}\n\n前文章节参考（最多3章）：\n{}\n\n{}\n\n用户补充要求：\n{}\n\n{}\n\n请直接输出最终章节正文。",
            input.novel_context,
            input.meta_context.unwrap_or_else(|| "（暂无）".to_string()),
            input.related_timeline_context,
            input.previous_chapters_context.unwrap_or_else(|| "（暂无）".to_string()),
            input.chapter_context,
            input.requirement,
            input.mode_instruction,
        ))
    }
}
