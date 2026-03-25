//! 角色设计 Agent Handler
//!
//! 负责设计小说角色

use crate::ai::agent::traits::{AgentContext, AgentHandler};
use async_trait::async_trait;
use serde::Deserialize;

/// 角色设计输入参数
#[derive(Debug, Deserialize)]
struct CharacterDesignInput {
    story_background: String,
    role_type: String,
    keywords: Vec<String>,
    relationship_hint: Option<String>,
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

    async fn build_user_prompt(&self, ctx: AgentContext) -> anyhow::Result<String> {
        let input: CharacterDesignInput = serde_json::from_value(ctx.input)?;

        let prompt = format!(
            r#"请设计一个小说角色：

故事背景：
{}

角色定位：
{}

关键词：
{}

关系提示：
{}

请输出：
1. 姓名
2. 基本资料
3. 外貌特征
4. 性格特征
5. 核心动机
6. 成长弧线
7. 与主角/其他角色关系
8. 可用于剧情推进的秘密或矛盾点"#,
            input.story_background,
            input.role_type,
            input.keywords.join("。"),
            input.relationship_hint.unwrap_or_default(),
        );

        Ok(prompt)
    }
}
