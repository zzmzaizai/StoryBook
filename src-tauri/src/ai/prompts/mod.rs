//! Agent 默认提示词配置
//!
//! 每个 Agent 一个独立的 TOML 文件，存储默认系统提示词

use handlebars::Handlebars;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;

#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PromptOutputFormat {
    Text,
    Markdown,
    Json,
    Structured,
}

impl PromptOutputFormat {
    pub fn runtime_instruction(&self) -> &'static str {
        match self {
            Self::Text => "输出应为纯文本，不要使用代码块包裹内容。",
            Self::Markdown => "输出应为可直接使用的 Markdown 正文，不要附加解释、前言或代码块。",
            Self::Json => "输出必须是合法 JSON，不要输出 JSON 之外的任何文本。",
            Self::Structured => "结果通过结构化字段提交；不要输出字段外文本，也不要补充解释。",
        }
    }
}

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
    pub fn prompt_hints(&self) -> Vec<String> {
        let mut hints = Vec::new();
        if let Some(language) = &self.language {
            hints.push(format!("- 输出语言：{}", language));
        }
        if let Some(style) = &self.style {
            hints.push(format!("- 表达风格：{}", style));
        }
        if let Some(detail_level) = &self.detail_level {
            hints.push(format!("- 细节层级：{}", detail_level));
        }
        if let Some(content_type) = &self.content_type {
            hints.push(format!("- 内容类型：{}", content_type));
        }
        if let Some(recommended_structure) = &self.recommended_structure {
            if !recommended_structure.is_empty() {
                hints.push(format!(
                    "- 推荐组织结构：{}",
                    recommended_structure.join(" / ")
                ));
            }
        }
        if let Some(recommended_length) = &self.recommended_length {
            hints.push(format!("- 推荐长度：{}", recommended_length));
        }
        if self.strict_json == Some(true) {
            hints.push("- 必须严格遵守 JSON 格式要求。".to_string());
        }
        if self.schema_locked == Some(true) {
            hints.push("- 必须严格遵守系统定义的字段和结构。".to_string());
        }
        hints
    }

    pub fn additional_params_value(&self) -> Option<serde_json::Value> {
        if self.additional_params.is_empty() {
            None
        } else {
            Some(serde_json::Value::Object(self.additional_params.clone()))
        }
    }
}

/// 提示词配置
#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]
pub struct PromptConfig {
    /// 系统提示词
    pub system_prompt: String,
    /// 可选的用户提示词模板
    #[serde(default)]
    pub user_template: Option<String>,
    /// 输出格式说明
    #[serde(default)]
    pub output_format: Option<PromptOutputFormat>,
    /// 额外的配置参数
    #[serde(default)]
    pub extra: PromptExtraConfig,
}

impl PromptConfig {
    pub fn render_system_prompt(&self) -> String {
        let mut sections = vec![self.system_prompt.trim().to_string()];

        if let Some(output_format) = &self.output_format {
            sections.push(format!(
                "## 输出协议\n{}",
                output_format.runtime_instruction()
            ));
        }

        let extra_hints = self.extra.prompt_hints();
        if !extra_hints.is_empty() {
            sections.push(format!("## 运行时提示\n{}", extra_hints.join("\n")));
        }

        sections
            .into_iter()
            .filter(|section| !section.trim().is_empty())
            .collect::<Vec<_>>()
            .join("\n\n")
    }
}

/// 提示词缓存
static PROMPT_CACHE: OnceLock<HashMap<String, PromptConfig>> = OnceLock::new();

/// 加载指定 Agent 的提示词
///
/// # 参数
/// - `agent_code`: Agent 代码
///
pub async fn load_prompt(agent_code: &str) -> anyhow::Result<String> {
    // 首先尝试从缓存获取
    if let Some(cache) = PROMPT_CACHE.get() {
        if let Some(config) = cache.get(agent_code) {
            return Ok(config.render_system_prompt());
        }
    }

    // 从文件加载
    let config = load_prompt_from_file(agent_code).await?;
    Ok(config.render_system_prompt())
}

/// 加载指定 Agent 的完整提示词配置
#[allow(dead_code)]
pub async fn load_prompt_config(agent_code: &str) -> anyhow::Result<PromptConfig> {
    load_prompt_from_file(agent_code).await
}

/// 从文件加载提示词配置
async fn load_prompt_from_file(agent_code: &str) -> anyhow::Result<PromptConfig> {
    let path = get_prompt_file_path(agent_code);

    if !path.exists() {
        // 如果文件不存在，返回内置默认提示词
        return Ok(get_builtin_prompt(agent_code));
    }

    let content = tokio::fs::read_to_string(&path).await?;
    let config: PromptConfig = toml::from_str(&content)?;

    Ok(config)
}

/// 获取提示词文件路径
fn get_prompt_file_path(agent_code: &str) -> PathBuf {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("src");
    path.push("ai");
    path.push("prompts");
    path.push(format!("{}.toml", agent_code));
    path
}

/// 获取内置默认提示词
fn get_builtin_prompt(agent_code: &str) -> PromptConfig {
    fn parse_embedded_prompt(content: &str, fallback: &str) -> PromptConfig {
        toml::from_str::<PromptConfig>(content).unwrap_or_else(|_| PromptConfig {
            system_prompt: fallback.to_string(),
            user_template: None,
            output_format: None,
            extra: PromptExtraConfig::default(),
        })
    }

    match agent_code {
        "general_chat" => parse_embedded_prompt(
            include_str!("general_chat.toml"),
            "你是一个专业的 AI 助手。",
        ),
        "novel_info_generator" => parse_embedded_prompt(
            include_str!("novel_info_generator.toml"),
            "你是一个专业的网络小说编辑和策划专家。必须只输出 JSON 对象，不要输出解释、前缀、markdown 或代码块。",
        ),
        "novel_outline" => parse_embedded_prompt(
            include_str!("novel_outline.toml"),
            "你是一个专业的小说策划编辑。",
        ),
        "chapter_timeline" => parse_embedded_prompt(
            include_str!("chapter_timeline.toml"),
            "你是一个专业的长篇小说章节规划助手。",
        ),
        "character_design" => parse_embedded_prompt(
            include_str!("character_design.toml"),
            "你是一个专业的小说角色设计师。",
        ),
        "meta_generator" => parse_embedded_prompt(
            include_str!("meta_generator.toml"),
            "你是专业的小说策划编辑，负责生成或改写小说元数据内容。",
        ),
        "chapter_content" => parse_embedded_prompt(
            include_str!("chapter_content.toml"),
            "你是专业的长篇小说章节写作编辑。",
        ),
        "chapter_polish" => parse_embedded_prompt(
            include_str!("chapter_polish.toml"),
            "你是专业的小说润色编辑。",
        ),
        _ => PromptConfig {
            system_prompt: "你是一个专业的 AI 助手。".to_string(),
            user_template: None,
            output_format: None,
            extra: PromptExtraConfig::default(),
        },
    }
}

pub fn render_user_template(template: &str, params: &serde_json::Value) -> anyhow::Result<String> {
    let registry = Handlebars::new();
    registry
        .render_template(template, params)
        .map(|rendered| rendered.trim().to_string())
        .map_err(|e| anyhow::anyhow!("渲染用户提示词模板失败: {}", e))
}

pub fn merge_additional_params(
    prompt_params: Option<serde_json::Value>,
    runtime_params: Option<serde_json::Value>,
) -> Option<serde_json::Value> {
    match (prompt_params, runtime_params) {
        (None, None) => None,
        (Some(value), None) | (None, Some(value)) => Some(value),
        (
            Some(serde_json::Value::Object(mut prompt_map)),
            Some(serde_json::Value::Object(runtime_map)),
        ) => {
            for (key, value) in runtime_map {
                prompt_map.insert(key, value);
            }
            Some(serde_json::Value::Object(prompt_map))
        }
        (_, Some(runtime)) => Some(runtime),
    }
}

/// 初始化提示词缓存
///
/// 在应用启动时调用，加载所有提示词到内存
#[allow(dead_code)]
pub async fn init_prompt_cache() -> anyhow::Result<()> {
    let mut cache = HashMap::new();

    let agents = [
        "general_chat",
        "novel_info_generator",
        "novel_outline",
        "chapter_timeline",
        "character_design",
        "meta_generator",
        "chapter_content",
        "chapter_polish",
    ];

    for agent_code in agents {
        if let Ok(config) = load_prompt_from_file(agent_code).await {
            cache.insert(agent_code.to_string(), config);
        }
    }

    let _ = PROMPT_CACHE.set(cache);
    Ok(())
}

/// 重新加载提示词缓存
#[allow(dead_code)]
pub async fn reload_prompt_cache() -> anyhow::Result<()> {
    init_prompt_cache().await
}
