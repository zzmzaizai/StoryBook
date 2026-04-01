use handlebars::Handlebars;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;

#[derive(Debug, Clone, Default, serde::Deserialize, serde::Serialize)]
pub struct PromptExtraConfig {
    pub language: Option<String>,
    pub style: Option<String>,
    pub detail_level: Option<String>,
    pub content_type: Option<String>,
    pub recommended_structure: Option<Vec<String>>,
    pub recommended_length: Option<String>,
    pub strict_json: Option<bool>,
    pub schema_locked: Option<bool>,
    #[serde(default)]
    pub additional_params: serde_json::Map<String, serde_json::Value>,
    #[serde(flatten)]
    pub metadata: HashMap<String, serde_json::Value>,
}

impl PromptExtraConfig {
    pub fn additional_params_value(&self) -> Option<serde_json::Value> {
        if self.additional_params.is_empty() {
            None
        } else {
            Some(serde_json::Value::Object(self.additional_params.clone()))
        }
    }
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct AgentMetaDefinition {
    pub code: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub icon: Option<String>,
    pub order: i32,
    pub streaming: bool,
    pub output_format: String,
    pub builtin: bool,
    pub ui_entry: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct PromptDefinition {
    pub system_prompt: String,
    #[serde(default)]
    pub user_template: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct AgentPromptDefinition {
    pub agent: AgentMetaDefinition,
    pub prompt: PromptDefinition,
    #[serde(default)]
    pub extra: PromptExtraConfig,
}

impl AgentPromptDefinition {
    pub fn extra_config_schema(&self) -> Vec<AgentExtraFieldDefinition> {
        let mut fields = Vec::new();

        if self.extra.language.is_some() {
            fields.push(AgentExtraFieldDefinition {
                key: "language".to_string(),
                label: "输出语言".to_string(),
                field_type: "text".to_string(),
                placeholder: Some("例如 zh-CN".to_string()),
            });
        }
        if self.extra.style.is_some() {
            fields.push(AgentExtraFieldDefinition {
                key: "style".to_string(),
                label: "风格".to_string(),
                field_type: "text".to_string(),
                placeholder: Some("例如 concise / detailed".to_string()),
            });
        }
        if self.extra.detail_level.is_some() {
            fields.push(AgentExtraFieldDefinition {
                key: "detail_level".to_string(),
                label: "细节层级".to_string(),
                field_type: "text".to_string(),
                placeholder: Some("例如 high / medium / low".to_string()),
            });
        }
        if self.extra.content_type.is_some() {
            fields.push(AgentExtraFieldDefinition {
                key: "content_type".to_string(),
                label: "内容类型".to_string(),
                field_type: "text".to_string(),
                placeholder: Some("例如 chapter_body".to_string()),
            });
        }
        if self.extra.recommended_length.is_some() {
            fields.push(AgentExtraFieldDefinition {
                key: "recommended_length".to_string(),
                label: "推荐长度".to_string(),
                field_type: "text".to_string(),
                placeholder: Some("例如 1000-3000".to_string()),
            });
        }
        if self.extra.strict_json.is_some() {
            fields.push(AgentExtraFieldDefinition {
                key: "strict_json".to_string(),
                label: "严格 JSON".to_string(),
                field_type: "boolean".to_string(),
                placeholder: None,
            });
        }
        if self.extra.schema_locked.is_some() {
            fields.push(AgentExtraFieldDefinition {
                key: "schema_locked".to_string(),
                label: "锁定结构".to_string(),
                field_type: "boolean".to_string(),
                placeholder: None,
            });
        }

        fields.sort_by(|a, b| a.key.cmp(&b.key));
        fields
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct AgentExtraFieldDefinition {
    pub key: String,
    pub label: String,
    pub field_type: String,
    pub placeholder: Option<String>,
}

#[derive(Debug, Clone)]
pub struct PromptConfig {
    pub system_prompt: String,
    pub user_template: Option<String>,
    pub extra: PromptExtraConfig,
}

static PROMPT_CACHE: OnceLock<HashMap<String, AgentPromptDefinition>> = OnceLock::new();

pub async fn list_agent_definitions() -> anyhow::Result<Vec<AgentPromptDefinition>> {
    let cache = load_prompt_cache().await?;
    let mut items = cache.values().cloned().collect::<Vec<_>>();
    items.sort_by(|a, b| {
        a.agent
            .order
            .cmp(&b.agent.order)
            .then_with(|| a.agent.code.cmp(&b.agent.code))
    });
    Ok(items)
}

pub async fn get_agent_definition(agent_code: &str) -> anyhow::Result<AgentPromptDefinition> {
    let cache = load_prompt_cache().await?;
    cache
        .get(agent_code)
        .cloned()
        .ok_or_else(|| anyhow::anyhow!("未找到 Agent 定义: {}", agent_code))
}

pub async fn load_prompt_config(agent_code: &str) -> anyhow::Result<PromptConfig> {
    let definition = get_agent_definition(agent_code).await?;
    Ok(PromptConfig {
        system_prompt: definition.prompt.system_prompt,
        user_template: definition.prompt.user_template,
        extra: definition.extra,
    })
}

async fn load_prompt_cache() -> anyhow::Result<&'static HashMap<String, AgentPromptDefinition>> {
    if let Some(cache) = PROMPT_CACHE.get() {
        return Ok(cache);
    }

    let mut map = HashMap::new();
    for agent_code in builtin_agent_codes() {
        let definition = load_prompt_from_file(agent_code).await?;
        map.insert(agent_code.to_string(), definition);
    }

    let _ = PROMPT_CACHE.set(map);
    Ok(PROMPT_CACHE
        .get()
        .expect("prompt cache should be initialized"))
}

async fn load_prompt_from_file(agent_code: &str) -> anyhow::Result<AgentPromptDefinition> {
    let path = get_prompt_file_path(agent_code);
    let content = tokio::fs::read_to_string(&path).await?;
    let definition: AgentPromptDefinition = toml::from_str(&content)?;
    Ok(definition)
}

fn get_prompt_file_path(agent_code: &str) -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("src");
    path.push("ai");
    path.push("prompts");
    path.push(format!("{}.toml", agent_code));
    path
}

fn builtin_agent_codes() -> &'static [&'static str] {
    &[
        "general_chat",
        "novel_info_generator",
        "novel_outline",
        "chapter_timeline",
        "character_design",
        "meta_generator",
        "chapter_content",
        "chapter_polish",
    ]
}

pub fn merge_additional_params(
    base: Option<serde_json::Value>,
    override_value: Option<serde_json::Value>,
) -> Option<serde_json::Value> {
    match (base, override_value) {
        (None, None) => None,
        (Some(base), None) => Some(base),
        (None, Some(override_value)) => Some(override_value),
        (Some(mut base), Some(override_value)) => {
            merge_json_values(&mut base, override_value);
            Some(base)
        }
    }
}

fn merge_json_values(target: &mut serde_json::Value, source: serde_json::Value) {
    match (target, source) {
        (serde_json::Value::Object(target_map), serde_json::Value::Object(source_map)) => {
            for (key, value) in source_map {
                match target_map.get_mut(&key) {
                    Some(existing) => merge_json_values(existing, value),
                    None => {
                        target_map.insert(key, value);
                    }
                }
            }
        }
        (target, source) => {
            *target = source;
        }
    }
}

pub fn render_user_template(template: &str, params: &serde_json::Value) -> anyhow::Result<String> {
    let registry = Handlebars::new();
    registry
        .render_template(template, params)
        .map_err(Into::into)
}
