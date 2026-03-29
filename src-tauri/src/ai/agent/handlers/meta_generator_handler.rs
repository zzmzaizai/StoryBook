use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct MetaGeneratorInput {
    novel_context: String,
    property_name: String,
    property_description: Option<String>,
    meta_context: Option<String>,
    current_content: Option<String>,
    requirement: String,
}

pub struct MetaGeneratorHandler;

#[async_trait]
impl AgentHandler for MetaGeneratorHandler {
    fn code(&self) -> &'static str {
        "meta_generator"
    }

    fn name(&self) -> &'static str {
        "小说元数据生成"
    }

    fn description(&self) -> &'static str {
        "根据小说基础信息与上下文生成或改写单项元数据。"
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: MetaGeneratorInput = ctx.parse()?;

        let action_text = match input.current_content.as_deref().map(str::trim) {
            Some(content) if !content.is_empty() => format!(
                "当前元数据编辑器已有内容，请基于现有内容进行修改、扩展和重写，输出完整的新内容：\n{}",
                content
            ),
            _ => "当前元数据编辑器为空，请根据上下文新生成完整内容。".to_string(),
        };

        Ok(format!(
            "{}\n\n当前要生成的元数据：\n- 名称：{}\n- 描述：{}\n\n其他已生成元数据：\n{}\n\n用户刚输入的补充要求：\n{}\n\n{}\n\n请直接输出最终正文内容。",
            input.novel_context,
            input.property_name,
            input.property_description.unwrap_or_default(),
            input.meta_context.unwrap_or_else(|| "（暂无）".to_string()),
            input.requirement,
            action_text,
        ))
    }
}
