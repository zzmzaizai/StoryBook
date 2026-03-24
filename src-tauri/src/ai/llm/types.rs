use serde::{Deserialize, Serialize};

/// LLM 运行时配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmRuntimeConfig {
    /// 提供商
    pub provider: String,
    /// 模型名称
    pub model: String,
    /// API 密钥
    pub api_key: Option<String>,
    /// 自定义网关地址
    pub base_url: Option<String>,
    /// 温度参数
    pub temperature: Option<f32>,
    /// 最大 token 数
    pub max_tokens: Option<u32>,
}

/// 流式响应块
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmStreamChunk {
    /// 内容块
    pub content: String,
    /// 是否是最后一块
    pub is_done: bool,
}

/// LLM 调用结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmCompletionResult {
    /// 生成的内容
    pub content: String,
    /// 使用的 token 数（如果可用）
    pub token_usage: Option<TokenUsage>,
}

/// Token 使用统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// LLM 调用参数
#[derive(Debug, Clone, Default)]
pub struct LlmCompletionParams {
    /// 系统提示词
    pub system_prompt: String,
    /// 用户提示词
    pub user_prompt: String,
    /// 温度参数
    pub temperature: Option<f32>,
    /// 最大 token 数
    pub max_tokens: Option<u32>,
}
