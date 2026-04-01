use std::fmt;
use std::sync::Arc;

use rig::completion::ToolDefinition;
use rig::tool::Tool;
use schemars::JsonSchema;
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};

use super::shared::ToolRequestCache;
use crate::repository::{CharacterRepository, MetaRepository};

#[derive(Debug)]
pub enum MetaToolError {
    Database(String),
}

impl fmt::Display for MetaToolError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Database(message) => write!(f, "{}", message),
        }
    }
}

impl std::error::Error for MetaToolError {}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ReadMetaContextArgs {
    pub query: Option<String>,
    pub property_name: Option<String>,
    pub property_names: Option<Vec<String>>,
    pub group_name: Option<String>,
    pub exclude_property_names: Option<Vec<String>>,
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct ReadMetaContextOutput {
    pub summary: String,
    pub total_count: usize,
    pub items: Vec<ReadMetaContextItem>,
}

#[derive(Debug, Serialize)]
pub struct ReadMetaContextItem {
    pub group_name: String,
    pub property_name: String,
    pub property_value: String,
}

#[derive(Debug, Clone)]
pub struct ReadMetaContextTool {
    db: Arc<DatabaseConnection>,
    novel_id: i32,
    current_property_name: String,
    cache: ToolRequestCache,
}

impl ReadMetaContextTool {
    pub fn new(
        db: Arc<DatabaseConnection>,
        novel_id: i32,
        current_property_name: String,
        cache: ToolRequestCache,
    ) -> Self {
        Self {
            db,
            novel_id,
            current_property_name,
            cache,
        }
    }
}

impl Tool for ReadMetaContextTool {
    const NAME: &'static str = "read_meta_context";
    type Error = MetaToolError;
    type Args = ReadMetaContextArgs;
    type Output = ReadMetaContextOutput;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "读取当前小说的其他元数据，用于保持设定兼容性和一致性。".to_string(),
            parameters: serde_json::to_value(schemars::schema_for!(ReadMetaContextArgs))
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
            args.limit.unwrap_or(8)
        );
        if self.cache.mark_seen(Self::NAME, cache_key) {
            return Ok(ReadMetaContextOutput {
                summary: "相同条件的元数据已读取过，本次不重复返回".to_string(),
                total_count: 0,
                items: vec![],
            });
        }

        let repo = MetaRepository::new(self.db.clone());
        let mut items = repo
            .find_by_novel(self.novel_id)
            .await
            .map_err(|err| MetaToolError::Database(err.to_string()))?;

        items.retain(|item| item.property_name != self.current_property_name);

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
                items.retain(|item| {
                    property_names.contains(&item.property_name.to_ascii_lowercase())
                });
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

        let limit = args.limit.unwrap_or(8).min(20) as usize;
        let mapped_items = items
            .into_iter()
            .filter_map(|item| {
                item.property_value.as_ref().and_then(|value| {
                    let value = value.trim();
                    if value.is_empty() {
                        None
                    } else {
                        Some(ReadMetaContextItem {
                            group_name: item.property_description.clone().unwrap_or_default(),
                            property_name: item.property_name,
                            property_value: excerpt(value, 180),
                        })
                    }
                })
            })
            .take(limit)
            .collect::<Vec<_>>();

        let total_count = mapped_items.len();
        let summary = if total_count == 0 {
            "未找到可参考的其他元数据，请优先按 property_name 精确查询。".to_string()
        } else {
            format!("返回 {} 条相关元数据", total_count)
        };

        Ok(ReadMetaContextOutput {
            summary,
            total_count,
            items: mapped_items,
        })
    }
}

#[derive(Debug, Deserialize, JsonSchema)]
pub struct ReadCharacterContextArgs {
    pub query: Option<String>,
    pub role_attribute: Option<i32>,
    pub exclude_names: Option<Vec<String>>,
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct ReadCharacterContextOutput {
    pub summary: String,
    pub total_count: usize,
    pub items: Vec<ReadCharacterContextItem>,
}

#[derive(Debug, Serialize)]
pub struct ReadCharacterContextItem {
    pub name: String,
    pub role_attribute: i32,
    pub personality: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ReadCharacterContextTool {
    db: Arc<DatabaseConnection>,
    novel_id: i32,
    cache: ToolRequestCache,
}

impl ReadCharacterContextTool {
    pub fn new(db: Arc<DatabaseConnection>, novel_id: i32, cache: ToolRequestCache) -> Self {
        Self {
            db,
            novel_id,
            cache,
        }
    }
}

impl Tool for ReadCharacterContextTool {
    const NAME: &'static str = "read_character_context";
    type Error = MetaToolError;
    type Args = ReadCharacterContextArgs;
    type Output = ReadCharacterContextOutput;

    async fn definition(&self, _prompt: String) -> ToolDefinition {
        ToolDefinition {
            name: Self::NAME.to_string(),
            description: "读取当前小说角色信息，用于保持人物、势力和关系设定一致。".to_string(),
            parameters: serde_json::to_value(schemars::schema_for!(ReadCharacterContextArgs))
                .unwrap_or_else(|_| serde_json::json!({"type": "object"})),
        }
    }

    async fn call(&self, args: Self::Args) -> Result<Self::Output, Self::Error> {
        let cache_key = format!(
            "{}|{}|{}|{}",
            args.query.as_deref().unwrap_or_default(),
            args.role_attribute.unwrap_or_default(),
            args.exclude_names
                .as_ref()
                .map(|items| items.join(","))
                .unwrap_or_default(),
            args.limit.unwrap_or(6)
        );
        if self.cache.mark_seen(Self::NAME, cache_key) {
            return Ok(ReadCharacterContextOutput {
                summary: "相同条件的角色信息已读取过，本次不重复返回".to_string(),
                total_count: 0,
                items: vec![],
            });
        }

        let repo = CharacterRepository::new(self.db.clone());
        let mut items = repo
            .find_all_by_novel(self.novel_id)
            .await
            .map_err(|err| MetaToolError::Database(err.to_string()))?;

        let query = args.query.unwrap_or_default().trim().to_string();
        if !query.is_empty() {
            items.retain(|item| {
                item.name.contains(&query)
                    || item
                        .personality
                        .as_deref()
                        .unwrap_or_default()
                        .contains(&query)
            });
        }

        if let Some(role_attribute) = args.role_attribute {
            items.retain(|item| item.role_attribute == role_attribute);
        }

        if let Some(exclude_names) = args.exclude_names.as_ref() {
            let exclude = exclude_names
                .iter()
                .map(|item| item.trim().to_ascii_lowercase())
                .filter(|item| !item.is_empty())
                .collect::<Vec<_>>();
            if !exclude.is_empty() {
                items.retain(|item| !exclude.contains(&item.name.to_ascii_lowercase()));
            }
        }

        let limit = args.limit.unwrap_or(6).min(12) as usize;
        let mapped_items = items
            .into_iter()
            .take(limit)
            .map(|item| ReadCharacterContextItem {
                name: item.name,
                role_attribute: item.role_attribute,
                personality: item.personality.map(|text| excerpt(&text, 120)),
            })
            .collect::<Vec<_>>();

        let total_count = mapped_items.len();
        let summary = if total_count == 0 {
            "未找到可参考的角色信息".to_string()
        } else {
            format!("返回 {} 条角色信息", total_count)
        };

        Ok(ReadCharacterContextOutput {
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
