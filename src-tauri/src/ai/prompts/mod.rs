//! Agent 默认提示词配置
//!
//! 每个 Agent 一个独立的 TOML 文件，存储默认系统提示词

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::OnceLock;

/// 提示词配置
#[derive(Debug, serde::Deserialize)]
pub struct PromptConfig {
    /// 系统提示词
    pub system_prompt: String,
    /// 可选的用户提示词模板
    #[allow(dead_code)]
    pub user_template: Option<String>,
    /// 输出格式说明
    #[allow(dead_code)]
    pub output_format: Option<String>,
    /// 额外的配置参数
    #[serde(flatten)]
    #[allow(dead_code)]
    pub extra: HashMap<String, serde_json::Value>,
}

/// 提示词缓存
static PROMPT_CACHE: OnceLock<HashMap<String, PromptConfig>> = OnceLock::new();

/// 加载指定 Agent 的提示词
///
/// # 参数
/// - `agent_code`: Agent 代码
///
/// # 返回
/// 系统提示词字符串
pub async fn load_prompt(agent_code: &str) -> anyhow::Result<String> {
    // 首先尝试从缓存获取
    if let Some(cache) = PROMPT_CACHE.get() {
        if let Some(config) = cache.get(agent_code) {
            return Ok(config.system_prompt.clone());
        }
    }

    // 从文件加载
    let config = load_prompt_from_file(agent_code).await?;
    Ok(config.system_prompt)
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
    match agent_code {
        "general_chat" => PromptConfig {
            system_prompt: include_str!("general_chat.toml")
                .parse::<toml::Value>()
                .ok()
                .and_then(|v| v.get("system_prompt").and_then(|s| s.as_str().map(String::from)))
                .unwrap_or_else(|| "你是一个专业的 AI 助手。".to_string()),
            user_template: None,
            output_format: None,
            extra: HashMap::new(),
        },
        "novel_info_generator" => PromptConfig {
            system_prompt: include_str!("novel_info_generator.toml")
                .parse::<toml::Value>()
                .ok()
                .and_then(|v| v.get("system_prompt").and_then(|s| s.as_str().map(String::from)))
                .unwrap_or_else(|| {
                    "你是一个专业的网络小说编辑和策划专家。必须只输出 JSON 对象，不要输出解释、前缀、markdown 或代码块。"
                        .to_string()
                }),
            user_template: None,
            output_format: None,
            extra: HashMap::new(),
        },
        "novel_outline" => PromptConfig {
            system_prompt: include_str!("novel_outline.toml")
                .parse::<toml::Value>()
                .ok()
                .and_then(|v| v.get("system_prompt").and_then(|s| s.as_str().map(String::from)))
                .unwrap_or_else(|| "你是一个专业的小说策划编辑。".to_string()),
            user_template: None,
            output_format: None,
            extra: HashMap::new(),
        },
        "chapter_timeline" => PromptConfig {
            system_prompt: include_str!("chapter_timeline.toml")
                .parse::<toml::Value>()
                .ok()
                .and_then(|v| v.get("system_prompt").and_then(|s| s.as_str().map(String::from)))
                .unwrap_or_else(|| "你是一个专业的长篇小说章节规划助手。".to_string()),
            user_template: None,
            output_format: None,
            extra: HashMap::new(),
        },
        "character_design" => PromptConfig {
            system_prompt: include_str!("character_design.toml")
                .parse::<toml::Value>()
                .ok()
                .and_then(|v| v.get("system_prompt").and_then(|s| s.as_str().map(String::from)))
                .unwrap_or_else(|| "你是一个专业的小说角色设计师。".to_string()),
            user_template: None,
            output_format: None,
            extra: HashMap::new(),
        },
        _ => PromptConfig {
            system_prompt: "你是一个专业的 AI 助手。".to_string(),
            user_template: None,
            output_format: None,
            extra: HashMap::new(),
        },
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
