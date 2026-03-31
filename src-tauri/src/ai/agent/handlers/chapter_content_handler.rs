use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ChapterContentInput {
    pub novel_context: String,
    pub meta_context: Option<String>,
    pub related_timeline_context: String,
    pub previous_chapters_context: Option<String>,
    pub chapter_context: String,
    pub requirement: String,
    pub mode_instruction: String,
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

    async fn build_prompt_params(
        &self,
        ctx: &AgentContext,
    ) -> anyhow::Result<Option<serde_json::Value>> {
        Ok(Some(serde_json::to_value(
            ctx.parse::<ChapterContentInput>()?,
        )?))
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: ChapterContentInput = ctx.parse()?;
        let requirement = input.requirement.trim();
        let requirement = if requirement.is_empty() {
            "（无额外要求）"
        } else {
            requirement
        };

        Ok(format!(
            "小说基础信息：\n{}\n\n其他已生成元数据：\n{}\n\n相关时间线：\n{}\n\n前文章节参考（最多3章）：\n{}\n\n当前章节信息：\n{}\n\n任务模式：\n{}\n\n补充要求：\n{}\n\n请直接输出最终章节正文，不要附加解释、标题建议或写作说明。",
            input.novel_context,
            input.meta_context.unwrap_or_else(|| "（暂无）".to_string()),
            input.related_timeline_context,
            input.previous_chapters_context.unwrap_or_else(|| "（暂无）".to_string()),
            input.chapter_context,
            input.mode_instruction,
            requirement,
        ))
    }
}
