//! AI 生成小说基础信息 Agent Handler
//!
//! 根据用户输入的小说要求，生成小说的基础信息 JSON

use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// AI 生成小说信息输入参数
#[derive(Debug, Clone, Deserialize, Serialize, JsonSchema)]
pub struct NovelInfoGeneratorInput {
    #[doc = "用户对小说的要求描述（一段话）"]
    pub requirement: String,
}

/// AI 生成的小说基础信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, JsonSchema)]
pub struct GeneratedNovelInfo {
    #[schemars(description = "小说标题，简洁、有吸引力，并与题材风格匹配")]
    pub title: String,
    #[schemars(description = "小说简介，100-200 字，概括主角处境、核心冲突和主要卖点")]
    pub description: String,
    #[schemars(
        description = "小说风格代码，1-10：1都市/2奇幻/3悬疑/4喜剧/5言情/6恐怖/7科幻/8历史/9武侠/10仙侠"
    )]
    pub style: i32,
    #[schemars(description = "目标读者代码，1-4：1男性/2女性/3儿童/4全体")]
    pub target_audience: i32,
    #[schemars(description = "篇幅类型代码，1-5：1超长篇/2长篇/3中篇/4短文/5其他")]
    pub length_type: i32,
    #[schemars(description = "预估章节总数，必须是整数")]
    pub estimated_chapter_count: i32,
    #[schemars(description = "预估总字数，必须是整数")]
    pub estimated_total_word_count: i64,
    #[schemars(description = "每章预估字数，必须是整数")]
    pub estimated_words_per_chapter: i32,
    #[schemars(description = "主角姓名；如果不适合明确命名，可留空")]
    pub protagonist_name: Option<String>,
    #[schemars(description = "主角简介，概括身份、能力或人格特征；如果不确定可留空")]
    pub protagonist_description: Option<String>,
    #[schemars(description = "核心冲突，明确主角必须面对的主要矛盾；如果不确定可留空")]
    pub core_conflict: Option<String>,
    #[schemars(description = "世界观设定摘要，概括故事发生环境和关键规则；如果不确定可留空")]
    pub world_setting: Option<String>,
}

/// AI 生成小说信息 Handler
pub struct NovelInfoGeneratorHandler;

#[async_trait]
impl AgentHandler for NovelInfoGeneratorHandler {
    fn code(&self) -> &'static str {
        "novel_info_generator"
    }

    fn name(&self) -> &'static str {
        "AI创建小说"
    }

    fn description(&self) -> &'static str {
        "根据用户描述的小说要求，AI生成小说的基础信息，包括标题、简介、风格、预估字数等"
    }

    async fn build_prompt_params(
        &self,
        ctx: &AgentContext,
    ) -> anyhow::Result<Option<serde_json::Value>> {
        Ok(Some(serde_json::to_value(
            ctx.parse::<NovelInfoGeneratorInput>()?,
        )?))
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: NovelInfoGeneratorInput = ctx.parse()?;

        let prompt = format!(
            r#"请根据以下小说要求，完成小说基础信息设计：

{}

请确保结果能够直接用于创建小说项目。
- 标题要有传播力，并与题材、基调一致。
- 简介要清楚写出主角处境、故事卖点和核心冲突。
- 风格、目标读者、篇幅类型必须使用系统定义的数值代码。
- 章节数、总字数、每章字数要彼此协调。
- 可以补充主角信息、核心冲突、世界观摘要；若确实无法确定，可留空。
- 不要把结果写到字段之外。"#,
            input.requirement
        );

        Ok(prompt)
    }
}
