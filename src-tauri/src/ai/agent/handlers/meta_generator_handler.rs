use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct MetaGeneratorInput {
    novel_context: String,
    property_name: String,
    property_description: Option<String>,
    meta_context: Option<String>,
    action: Option<String>,
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

        let action = input.action.as_deref().unwrap_or("generate");
        let current_content = input.current_content.as_deref().unwrap_or("").trim();

        let action_text = match action {
            "improve" if !current_content.is_empty() => format!(
                "当前任务：优化现有元数据内容，在保留核心设定的前提下提升表达、结构与完整度。现有内容：\n{}",
                current_content
            ),
            "rewrite" if !current_content.is_empty() => format!(
                "当前任务：重写现有元数据内容，可以重组表达方式，但要保留核心设定。现有内容：\n{}",
                current_content
            ),
            "expand" if !current_content.is_empty() => format!(
                "当前任务：扩展现有元数据内容，补充更多细节、层次与说明。现有内容：\n{}",
                current_content
            ),
            "condense" if !current_content.is_empty() => format!(
                "当前任务：精简整理现有元数据内容，去掉重复和冗余，保留关键信息。现有内容：\n{}",
                current_content
            ),
            "generate" if !current_content.is_empty() => format!(
                "当前任务：参考现有内容重新生成一版更完整的元数据正文。现有内容：\n{}",
                current_content
            ),
            _ => "当前编辑器为空，请根据上下文直接生成完整元数据内容。".to_string(),
        };

        let requirement_text = input.requirement.trim();

        Ok(format!(
            "{}\n\n当前要生成的元数据：\n- 名称：{}\n- 描述：{}\n\n其他已生成元数据：\n{}\n\n补充要求：\n{}\n\n{}\n\n请直接输出最终正文内容。",
            input.novel_context,
            input.property_name,
            input.property_description.unwrap_or_default(),
            input.meta_context.unwrap_or_else(|| "（暂无）".to_string()),
            if requirement_text.is_empty() { "（无额外要求）" } else { requirement_text },
            action_text,
        ))
    }
}
