//! 小说大纲 Agent Handler
//!
//! 负责生成小说大纲

use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use serde::Deserialize;

/// 小说大纲输入参数
#[derive(Debug, Deserialize)]
struct NovelOutlineInput {
    title: Option<String>,
    genre: String,
    theme: Option<String>,
    world_setting: String,
    core_conflict: String,
    style: Option<String>,
    target_length: Option<String>,
}

/// 小说大纲 Agent Handler
pub struct NovelOutlineHandler;

#[async_trait]
impl AgentHandler for NovelOutlineHandler {
    fn code(&self) -> &'static str {
        "novel_outline"
    }

    fn name(&self) -> &'static str {
        "小说大纲生成"
    }

    fn description(&self) -> &'static str {
        "根据用户提供的小说题材、核心设定、世界观和风格偏好，生成完整的大纲"
    }

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: NovelOutlineInput = serde_json::from_value(ctx.input)?;

        let prompt = format!(
            r#"请根据以下信息生成小说大纲：

标题：{}
题材：{}
主题：{}
世界观/设定：{}
核心冲突：{}
风格：{}
目标篇幅：{}

请输出：
1. 故事简介
2. 故事主线
3. 三幕式结构
4. 主要冲突
5. 结局方向
6. 可延展支线"#,
            input.title.unwrap_or_default(),
            input.genre,
            input.theme.unwrap_or_default(),
            input.world_setting,
            input.core_conflict,
            input.style.unwrap_or_default(),
            input.target_length.unwrap_or_default(),
        );

        Ok(prompt)
    }
}
