use std::fmt;
use std::sync::Arc;

use rig::completion::ToolDefinition;
use rig::tool::Tool;
use schemars::JsonSchema;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use super::shared::ToolRequestCache;
use crate::repository::{MetaRepository, TimelineRepository};

#[derive(Debug)]
pub enum TimelineToolError {
    Database(String),
}

impl fmt::Display for TimelineToolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(message) => write!(f, "{}", message),
        }
    }
}

impl std::error::Error for TimelineToolError {}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ReadNovelMetaArgs {
    #[schemars(description = "可选关键字，用于按名称或内容过滤元数据")]
    pub query: Option<String>,
    #[schemars(description = "按元数据名称精确查询，例如 worldbuilding、power_system")]
    pub property_name: Option<String>,
    #[schemars(description = "按元数据名称批量精确查询")]
    pub property_names: Option<Vec<String>>,
    #[schemars(description = "按分组过滤，例如 世界观、势力、修炼体系")]
    pub group_name: Option<String>,
    #[schemars(description = "排除这些元数据名称，避免重复读取")]
    pub exclude_property_names: Option<Vec<String>>,
    #[schemars(description = "最多返回多少条结果，建议不超过 20")]
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct ReadNovelMetaOutput {
    pub summary: String,
    pub total_count: usize,
    pub items: Vec<ReadNovelMetaItem>,
}

#[derive(Debug, Serialize)]
pub struct ReadNovelMetaItem {
    pub group_name: String,
    pub property_name: String,
    pub property_value: String,
}

#[derive(Debug, Clone)]
pub struct ReadNovelMetaTool {
    db: Arc<DatabaseConnection>,
    novel_id: i32,
    cache: ToolRequestCache,
}

impl ReadNovelMetaTool {
    pub fn new(db: Arc<DatabaseConnection>, novel_id: i32, cache: ToolRequestCache) -> Self {
        Self { db, novel_id, cache }
    }
}

impl Tool for ReadNovelMetaTool {
    const NAME: &'static str = "read_novel_meta";
    type Error = TimelineToolError;
    type Args = ReadNovelMetaArgs;
    type Output = ReadNovelMetaOutput;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "读取当前小说的元数据，用于补充世界观、人物设定、冲突与风格约束。"
                .to_string(),
            parameters: serde_json::to_value(schemars::schema_for!(ReadNovelMetaArgs))
                .unwrap_or_else(|_| serde_json::json!({"type": "object"})),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let cache_key = format!(
            "{}|{}|{}|{}|{}",
            args.property_name.as_deref().unwrap_or_default(),
            args.property_names
                .as_ref()
                .map(|items| items.join(","))
                .unwrap_or_default(),
            args.group_name.as_deref().unwrap_or_default(),
            args.query.as_deref().unwrap_or_default(),
            args.limit.unwrap_or(10)
        );
        if self.cache.mark_seen(Self::NAME, cache_key) {
            return Ok(ReadNovelMetaOutput {
                summary: "相同条件的元数据已读取过，本次不重复返回".to_string(),
                total_count: 0,
                items: vec![],
            });
        }

        let repo = MetaRepository::new(self.db.clone());
        let mut items = repo
            .find_by_novel(self.novel_id)
            .await
            .map_err(|err| TimelineToolError::Database(err.to_string()))?;

        let property_name = args.property_name.unwrap_or_default().trim().to_string();
        if !property_name.is_empty() {
            items.retain(|item| item.property_name.eq_ignore_ascii_case(&property_name));
        }

        if let Some(property_names) = args.property_names.as_ref() {
            let property_names = property_names
                .iter()
                .map(|item| item.trim().to_ascii_lowercase())
                .filter(|item| !item.is_empty())
                .collect::<Vec<_>>();
            if !property_names.is_empty() {
                items.retain(|item| property_names.contains(&item.property_name.to_ascii_lowercase()));
            }
        }

        if let Some(exclude_property_names) = args.exclude_property_names.as_ref() {
            let exclude = exclude_property_names
                .iter()
                .map(|item| item.trim().to_ascii_lowercase())
                .filter(|item| !item.is_empty())
                .collect::<Vec<_>>();
            if !exclude.is_empty() {
                items.retain(|item| !exclude.contains(&item.property_name.to_ascii_lowercase()));
            }
        }

        let group_name = args.group_name.unwrap_or_default().trim().to_string();

        let query = args.query.unwrap_or_default().trim().to_string();
        if !group_name.is_empty() || !query.is_empty() {
            items.retain(|item| {
                item.property_name.contains(&query)
                    || item
                        .property_description
                        .as_deref()
                        .unwrap_or_default()
                        .contains(&group_name)
                    || item
                        .property_description
                        .as_deref()
                        .unwrap_or_default()
                        .contains(&query)
                    || item
                        .property_value
                        .as_deref()
                        .unwrap_or_default()
                        .contains(&query)
            });
        }

        let limit = args.limit.unwrap_or(10).min(20) as usize;
        let mapped_items = items
            .into_iter()
            .filter_map(|item| {
                item.property_value.as_ref().and_then(|value| {
                    let value = value.trim();
                    if value.is_empty() {
                        None
                    } else {
                        Some(ReadNovelMetaItem {
                            group_name: item.property_description.clone().unwrap_or_default(),
                            property_name: item.property_name,
                            property_value: value.to_string(),
                        })
                    }
                })
            })
            .take(limit)
            .collect::<Vec<_>>();

        let total_count = mapped_items.len();
        let summary = if total_count == 0 {
            "未找到匹配的小说元数据，请优先按 property_name 精确查询。".to_string()
        } else {
            format!("返回 {} 条小说元数据", total_count)
        };

        Ok(ReadNovelMetaOutput {
            summary,
            total_count,
            items: mapped_items,
        })
    }
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ReadPreviousTimelinesArgs {
    #[schemars(description = "只返回结束章节号小于等于该值的时间线")]
    pub before_chapter: Option<u32>,
    #[schemars(description = "只返回开始章节号大于等于该值的时间线")]
    pub after_chapter: Option<u32>,
    #[schemars(description = "按标题关键词过滤")]
    pub title_query: Option<String>,
    #[schemars(description = "最多返回多少条结果，建议不超过 10")]
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct ReadPreviousTimelinesOutput {
    pub summary: String,
    pub total_count: usize,
    pub items: Vec<ReadPreviousTimelineItem>,
}

#[derive(Debug, Serialize)]
pub struct ReadPreviousTimelineItem {
    pub title: String,
    pub chapter_range: String,
    pub content_excerpt: String,
}

#[derive(Debug, Clone)]
pub struct ReadPreviousTimelinesTool {
    db: Arc<DatabaseConnection>,
    novel_id: i32,
    cache: ToolRequestCache,
}

impl ReadPreviousTimelinesTool {
    pub fn new(db: Arc<DatabaseConnection>, novel_id: i32, cache: ToolRequestCache) -> Self {
        Self { db, novel_id, cache }
    }
}

impl Tool for ReadPreviousTimelinesTool {
    const NAME: &'static str = "read_previous_timelines";
    type Error = TimelineToolError;
    type Args = ReadPreviousTimelinesArgs;
    type Output = ReadPreviousTimelinesOutput;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "读取当前小说之前已经存在的时间线，帮助保持剧情连续性。".to_string(),
            parameters: serde_json::to_value(schemars::schema_for!(ReadPreviousTimelinesArgs))
                .unwrap_or_else(|_| serde_json::json!({"type": "object"})),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let cache_key = format!(
            "{}|{}|{}|{}",
            args.before_chapter.unwrap_or_default(),
            args.after_chapter.unwrap_or_default(),
            args.title_query.as_deref().unwrap_or_default(),
            args.limit.unwrap_or(5)
        );
        if self.cache.mark_seen(Self::NAME, cache_key) {
            return Ok(ReadPreviousTimelinesOutput {
                summary: "相同范围的前文时间线已读取过，本次不重复返回".to_string(),
                total_count: 0,
                items: vec![],
            });
        }

        let repo = TimelineRepository::new(self.db.clone());
        let mut items = repo
            .find_by_novel(self.novel_id)
            .await
            .map_err(|err| TimelineToolError::Database(err.to_string()))?;

        if let Some(before_chapter) = args.before_chapter {
            items.retain(|item| {
                item.end_chapter_number
                    .map(|end| end <= before_chapter as i32)
                    .unwrap_or(false)
            });
        }

        if let Some(after_chapter) = args.after_chapter {
            items.retain(|item| {
                item.start_chapter_number
                    .map(|start| start >= after_chapter as i32)
                    .unwrap_or(false)
            });
        }

        let title_query = args.title_query.unwrap_or_default().trim().to_string();
        if !title_query.is_empty() {
            items.retain(|item| item.title.contains(&title_query));
        }

        let limit = args.limit.unwrap_or(5).min(10) as usize;
        let mapped_items = items
            .into_iter()
            .rev()
            .take(limit)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .map(|item| ReadPreviousTimelineItem {
                title: item.title,
                chapter_range: format!(
                    "第{}章 - 第{}章",
                    item.start_chapter_number.unwrap_or(0),
                    item.end_chapter_number.unwrap_or(0)
                ),
                content_excerpt: excerpt(item.content.as_deref().unwrap_or_default(), 160),
            })
            .collect::<Vec<_>>();

        let total_count = mapped_items.len();
        let summary = if total_count == 0 {
            "未找到可参考的历史时间线".to_string()
        } else {
            format!("返回 {} 条历史时间线", total_count)
        };

        Ok(ReadPreviousTimelinesOutput {
            summary,
            total_count,
            items: mapped_items,
        })
    }
}

fn excerpt(content: &str, limit: usize) -> String {
    let compact = content.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut chars = compact.chars();
    let shortened: String = chars.by_ref().take(limit).collect();
    if chars.next().is_some() {
        format!("{}...", shortened)
    } else {
        shortened
    }
}
