//! AI 生成小说基础信息 Agent Handler
//!
//! 根据用户输入的小说要求，生成小说的基础信息 JSON

use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use schemars::JsonSchema;
use serde::Deserialize;

/// AI 生成小说信息输入参数
#[derive(Debug, Deserialize, JsonSchema)]
pub struct NovelInfoGeneratorInput {
    #[doc = "用户对小说的要求描述（一段话）"]
    pub requirement: String,
}

/// AI 生成的小说基础信息
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GeneratedNovelInfo {
    /// 小说标题
    pub title: String,
    /// 小说简介（100-200字）
    pub description: String,
    /// 小说风格（1-10：1都市/2奇幻/3悬疑/4喜剧/5言情/6恐怖/7科幻/8历史/9武侠/10仙侠）
    pub style: i32,
    /// 目标读者（1-4：1男性/2女性/3儿童/4全体）
    pub target_audience: i32,
    /// 篇幅类型（1-5：1超长篇/2长篇/3中篇/4短文/5其他）
    pub length_type: i32,
    /// 预估章节数
    pub estimated_chapter_count: i32,
    /// 预估总字数
    pub estimated_total_word_count: i64,
    /// 每章预估字数
    pub estimated_words_per_chapter: i32,
    /// 主角姓名
    pub protagonist_name: Option<String>,
    /// 主角简介
    pub protagonist_description: Option<String>,
    /// 核心冲突
    pub core_conflict: Option<String>,
    /// 世界观设定摘要
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

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: NovelInfoGeneratorInput = ctx.parse()?;

        let prompt = format!(
            r#"请根据以下小说要求，生成小说的基础信息。

用户要求：
{}

请严格按照 JSON 格式输出，不要包含任何其他文字说明。输出格式如下：
{{
  "title": "小说标题",
  "description": "小说简介（100-200字）",
  "style": 1,
  "target_audience": 4,
  "length_type": 3,
  "estimated_chapter_count": 50,
  "estimated_total_word_count": 150000,
  "estimated_words_per_chapter": 3000,
  "protagonist_name": "主角姓名",
  "protagonist_description": "主角简介",
  "core_conflict": "核心冲突",
  "world_setting": "世界观设定"
}}

风格(style)取值说明：1=都市, 2=奇幻, 3=悬疑, 4=喜剧, 5=言情, 6=恐怖, 7=科幻, 8=历史, 9=武侠, 10=仙侠
目标读者(target_audience)取值说明：1=男性, 2=女性, 3=儿童, 4=全体
篇幅类型(length_type)取值说明：1=超长篇(100万字以上), 2=长篇(30-100万字), 3=中篇(10-30万字), 4=短文(10万字以下), 5=其他"#,
            input.requirement
        );

        Ok(prompt)
    }
}