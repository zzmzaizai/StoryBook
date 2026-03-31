//! 角色设计 Agent Handler
//!
//! 负责设计小说角色

use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// 角色设计输入参数
#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
pub struct CharacterDesignInput {
    pub novel_context: String,
    pub meta_context: String,
    pub existing_characters_context: String,
    pub current_character_context: String,
    pub role_type: String,
    pub requirement: Option<String>,
}

/// 角色设计 Agent Handler
pub struct CharacterDesignHandler;

#[async_trait]
impl AgentHandler for CharacterDesignHandler {
    fn code(&self) -> &'static str {
        "character_design"
    }

    fn name(&self) -> &'static str {
        "角色设计"
    }

    fn description(&self) -> &'static str {
        "根据故事背景设计角色，包括基本资料、性格特征、核心动机等"
    }

    async fn build_prompt_params(
        &self,
        ctx: &AgentContext,
    ) -> anyhow::Result<Option<serde_json::Value>> {
        Ok(Some(serde_json::to_value(
            ctx.parse::<CharacterDesignInput>()?,
        )?))
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: CharacterDesignInput = ctx.parse()?;
        let meta_context = if input.meta_context.trim().is_empty() {
            "（暂无）"
        } else {
            input.meta_context.trim()
        };
        let existing_characters_context = if input.existing_characters_context.trim().is_empty() {
            "（暂无）"
        } else {
            input.existing_characters_context.trim()
        };
        let requirement = input
            .requirement
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("（无额外要求）");

        let prompt = format!(
            r#"请基于当前小说上下文设计一个角色，用于直接填写角色卡。

小说基础信息：
{}

已生成元数据：
{}

已有角色摘要（避免重复）：
{}

当前角色信息：
{}

角色定位：
{}

补充要求：
{}

请生成一个与当前小说设定一致、能推动剧情的角色结果。
- 名称、角色属性、性别、角色类型必须可直接落库。
- personality 字段使用 Markdown，重点写性格、动机、矛盾点、剧情作用和关系张力。
- 避免与已有角色高度重复。
- 不要把结果写到字段之外。"#,
            input.novel_context,
            meta_context,
            existing_characters_context,
            input.current_character_context,
            input.role_type,
            requirement,
        );

        Ok(prompt)
    }
}
