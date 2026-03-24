//! LLM 工厂类
//!
//! 统一创建不同 provider 的 LLM 客户端

use crate::ai::llm::provider::LlmProvider;
use crate::ai::llm::types::{LlmCompletionParams, LlmCompletionResult, LlmRuntimeConfig, LlmStreamChunk};
use crate::entity::llm_config;
use rig::completion::Prompt;
use rig::providers;
use futures::StreamExt;

/// LLM 工厂类
///
/// 负责根据配置创建对应的 LLM 客户端实例
pub struct LlmFactory;

impl LlmFactory {
    /// 从数据库配置创建 LLM 运行时配置
    pub fn create_runtime_config(config: &llm_config::Model) -> LlmRuntimeConfig {
        let extra_config = config.extra_config.as_ref();

        LlmRuntimeConfig {
            provider: config.provider.clone(),
            model: config.model.clone(),
            api_key: config.api_key.clone(),
            base_url: config.base_url.clone(),
            temperature: extra_config.and_then(|v| v.get("temperature").and_then(|t| t.as_f64().map(|f| f as f32))),
            max_tokens: extra_config.and_then(|v| v.get("max_tokens").and_then(|t| t.as_u64().map(|u| u as u32))),
        }
    }

    /// 创建 rig 客户端
    ///
    /// 根据 provider 类型创建对应的 rig 客户端
    pub fn create_rig_client(config: &LlmRuntimeConfig) -> anyhow::Result<Box<dyn LlmClient>> {
        let provider = LlmProvider::from(config.provider.as_str());

        match provider {
            LlmProvider::OpenAi => Ok(Box::new(OpenAiClient::new(config))),
            LlmProvider::Anthropic => Ok(Box::new(AnthropicClient::new(config))),
            LlmProvider::DeepSeek => Ok(Box::new(DeepSeekClient::new(config))),
            LlmProvider::Gemini => Ok(Box::new(GeminiClient::new(config))),
            LlmProvider::Ollama => Ok(Box::new(OllamaClient::new(config))),
            LlmProvider::Other(name) => Err(anyhow::anyhow!("不支持的 LLM 提供商: {}", name)),
        }
    }
}

/// LLM 客户端 trait
///
/// 定义所有 LLM 客户端必须实现的接口
#[async_trait::async_trait]
pub trait LlmClient: Send + Sync {
    /// 执行对话补全
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult>;

    /// 执行流式对话补全
    async fn complete_stream(
        &self,
        params: LlmCompletionParams,
        tx: tokio::sync::mpsc::Sender<LlmStreamChunk>,
    ) -> anyhow::Result<()>;

    /// 获取提供商名称
    fn provider(&self) -> &str;

    /// 获取模型名称
    fn model(&self) -> &str;
}

// ==================== 各提供商客户端实现 ====================

/// OpenAI 客户端
pub struct OpenAiClient {
    config: LlmRuntimeConfig,
}

impl OpenAiClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for OpenAiClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        let api_key = self.config.api_key.clone()
            .ok_or_else(|| anyhow::anyhow!("OpenAI API key not configured"))?;
        
        // 清理 base_url，移除末尾的 /v1 或 /
        let base_url = self.config.base_url.as_ref().map(|url| {
            let url = url.trim_end_matches("/v1").trim_end_matches('/');
            url.to_string()
        });
        
        // 创建 OpenAI 客户端，支持自定义 base_url
        let client = if let Some(ref url) = base_url {
            println!("[OpenAI] Using custom base_url: {}", url);
            providers::openai::Client::from_url(&api_key, url)
        } else {
            println!("[OpenAI] Using default OpenAI API");
            providers::openai::Client::new(&api_key)
        };
        
        println!("[OpenAI] Model: {}, Temperature: {:?}", self.config.model, self.config.temperature);
        println!("[OpenAI] User prompt length: {}", params.user_prompt.len());
        
        // 构建 agent
        let mut agent_builder = client.agent(&self.config.model);
        
        // 添加系统提示词
        if !params.system_prompt.is_empty() {
            agent_builder = agent_builder.preamble(&params.system_prompt);
        }
        
        // 设置温度参数
        if let Some(temperature) = self.config.temperature {
            agent_builder = agent_builder.temperature(temperature as f64);
        }
        
        let agent = agent_builder.build();
        
        // 执行对话
        let response = agent.prompt(&params.user_prompt).await
            .map_err(|e| anyhow::anyhow!("OpenAI API call failed: {}", e))?;

        Ok(LlmCompletionResult {
            content: response,
            token_usage: None,
        })
    }

    async fn complete_stream(
        &self,
        params: LlmCompletionParams,
        tx: tokio::sync::mpsc::Sender<LlmStreamChunk>,
    ) -> anyhow::Result<()> {
        use rig::streaming::{StreamingPrompt, StreamingChoice};
        
        let api_key = self.config.api_key.clone()
            .ok_or_else(|| anyhow::anyhow!("OpenAI API key not configured"))?;
        
        // 清理 base_url
        let base_url = self.config.base_url.as_ref().map(|url| {
            let url = url.trim_end_matches("/v1").trim_end_matches('/');
            url.to_string()
        });
        
        // 创建 OpenAI 客户端
        let client = if let Some(ref url) = base_url {
            println!("[OpenAI Stream] Using custom base_url: {}", url);
            providers::openai::Client::from_url(&api_key, url)
        } else {
            println!("[OpenAI Stream] Using default OpenAI API");
            providers::openai::Client::new(&api_key)
        };
        
        // 构建 agent
        let mut agent_builder = client.agent(&self.config.model);
        
        // 添加系统提示词
        if !params.system_prompt.is_empty() {
            agent_builder = agent_builder.preamble(&params.system_prompt);
        }
        
        // 设置温度参数
        if let Some(temperature) = self.config.temperature {
            agent_builder = agent_builder.temperature(temperature as f64);
        }
        
        let agent = agent_builder.build();
        
        // 执行流式对话
        let mut stream = agent.stream_prompt(&params.user_prompt).await
            .map_err(|e| anyhow::anyhow!("OpenAI streaming API call failed: {}", e))?;
        
        // 处理流式响应
        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(StreamingChoice::Message(text)) => {
                    tx.send(LlmStreamChunk {
                        content: text,
                        is_done: false,
                    }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
                }
                Ok(StreamingChoice::ToolCall(_, _, _)) => {
                    // 忽略工具调用
                }
                Err(e) => {
                    eprintln!("Stream error: {}", e);
                }
            }
        }
        
        // 发送完成标记
        tx.send(LlmStreamChunk {
            content: String::new(),
            is_done: true,
        }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
        
        Ok(())
    }

    fn provider(&self) -> &str {
        "openai"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}

/// Anthropic 客户端
pub struct AnthropicClient {
    config: LlmRuntimeConfig,
}

impl AnthropicClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for AnthropicClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        // TODO: 使用 rig 实现 Anthropic 调用
        Ok(LlmCompletionResult {
            content: format!("[Anthropic Mock] {}", params.user_prompt),
            token_usage: None,
        })
    }

    async fn complete_stream(
        &self,
        params: LlmCompletionParams,
        tx: tokio::sync::mpsc::Sender<LlmStreamChunk>,
    ) -> anyhow::Result<()> {
        // 使用非流式方式模拟
        let result = self.complete(params).await?;
        
        let content = result.content;
        let chunk_size = 5;
        
        for chunk in content.chars().collect::<Vec<_>>().chunks(chunk_size) {
            let chunk_str: String = chunk.iter().collect();
            tx.send(LlmStreamChunk {
                content: chunk_str,
                is_done: false,
            }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
            tokio::time::sleep(tokio::time::Duration::from_millis(30)).await;
        }
        
        tx.send(LlmStreamChunk {
            content: String::new(),
            is_done: true,
        }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
        
        Ok(())
    }

    fn provider(&self) -> &str {
        "anthropic"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}

/// DeepSeek 客户端
pub struct DeepSeekClient {
    config: LlmRuntimeConfig,
}

impl DeepSeekClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for DeepSeekClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        let api_key = self.config.api_key.clone()
            .ok_or_else(|| anyhow::anyhow!("DeepSeek API key not configured"))?;
        
        // DeepSeek 使用 OpenAI 兼容接口
        let base_url = self.config.base_url.clone()
            .unwrap_or_else(|| "https://api.deepseek.com".to_string());
        
        let client = providers::openai::Client::from_url(&api_key, &base_url);
        
        // 构建 agent
        let mut agent_builder = client.agent(&self.config.model);
        
        // 添加系统提示词
        if !params.system_prompt.is_empty() {
            agent_builder = agent_builder.preamble(&params.system_prompt);
        }
        
        // 设置温度参数
        if let Some(temperature) = self.config.temperature {
            agent_builder = agent_builder.temperature(temperature as f64);
        }
        
        let agent = agent_builder.build();
        
        // 执行对话
        let response = agent.prompt(&params.user_prompt).await?;

        Ok(LlmCompletionResult {
            content: response,
            token_usage: None,
        })
    }

    async fn complete_stream(
        &self,
        params: LlmCompletionParams,
        tx: tokio::sync::mpsc::Sender<LlmStreamChunk>,
    ) -> anyhow::Result<()> {
        use rig::streaming::{StreamingPrompt, StreamingChoice};
        
        let api_key = self.config.api_key.clone()
            .ok_or_else(|| anyhow::anyhow!("DeepSeek API key not configured"))?;
        
        // DeepSeek 使用 OpenAI 兼容接口
        let base_url = self.config.base_url.clone()
            .unwrap_or_else(|| "https://api.deepseek.com".to_string());
        
        let client = providers::openai::Client::from_url(&api_key, &base_url);
        
        // 构建 agent
        let mut agent_builder = client.agent(&self.config.model);
        
        // 添加系统提示词
        if !params.system_prompt.is_empty() {
            agent_builder = agent_builder.preamble(&params.system_prompt);
        }
        
        // 设置温度参数
        if let Some(temperature) = self.config.temperature {
            agent_builder = agent_builder.temperature(temperature as f64);
        }
        
        let agent = agent_builder.build();
        
        // 执行流式对话
        let mut stream = agent.stream_prompt(&params.user_prompt).await
            .map_err(|e| anyhow::anyhow!("DeepSeek streaming API call failed: {}", e))?;
        
        // 处理流式响应
        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(StreamingChoice::Message(text)) => {
                    tx.send(LlmStreamChunk {
                        content: text,
                        is_done: false,
                    }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
                }
                Ok(StreamingChoice::ToolCall(_, _, _)) => {
                    // 忽略工具调用
                }
                Err(e) => {
                    eprintln!("Stream error: {}", e);
                }
            }
        }
        
        // 发送完成标记
        tx.send(LlmStreamChunk {
            content: String::new(),
            is_done: true,
        }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
        
        Ok(())
    }

    fn provider(&self) -> &str {
        "deepseek"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}

/// Gemini 客户端
pub struct GeminiClient {
    config: LlmRuntimeConfig,
}

impl GeminiClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for GeminiClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        // TODO: 使用 rig 实现 Gemini 调用
        Ok(LlmCompletionResult {
            content: format!("[Gemini Mock] {}", params.user_prompt),
            token_usage: None,
        })
    }

    async fn complete_stream(
        &self,
        params: LlmCompletionParams,
        tx: tokio::sync::mpsc::Sender<LlmStreamChunk>,
    ) -> anyhow::Result<()> {
        // 使用非流式方式模拟
        let result = self.complete(params).await?;
        
        let content = result.content;
        let chunk_size = 5;
        
        for chunk in content.chars().collect::<Vec<_>>().chunks(chunk_size) {
            let chunk_str: String = chunk.iter().collect();
            tx.send(LlmStreamChunk {
                content: chunk_str,
                is_done: false,
            }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
            tokio::time::sleep(tokio::time::Duration::from_millis(30)).await;
        }
        
        tx.send(LlmStreamChunk {
            content: String::new(),
            is_done: true,
        }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
        
        Ok(())
    }

    fn provider(&self) -> &str {
        "gemini"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}

/// Ollama 客户端
pub struct OllamaClient {
    config: LlmRuntimeConfig,
}

impl OllamaClient {
    pub fn new(config: &LlmRuntimeConfig) -> Self {
        Self {
            config: config.clone(),
        }
    }
}

#[async_trait::async_trait]
impl LlmClient for OllamaClient {
    async fn complete(&self, params: LlmCompletionParams) -> anyhow::Result<LlmCompletionResult> {
        // Ollama 使用 OpenAI 兼容接口
        let base_url = self.config.base_url.clone()
            .unwrap_or_else(|| "http://localhost:11434".to_string());
        
        // Ollama 不需要 API key，使用空字符串
        let client = providers::openai::Client::from_url("", &base_url);
        
        // 构建 agent
        let mut agent_builder = client.agent(&self.config.model);
        
        // 添加系统提示词
        if !params.system_prompt.is_empty() {
            agent_builder = agent_builder.preamble(&params.system_prompt);
        }
        
        // 设置温度参数
        if let Some(temperature) = self.config.temperature {
            agent_builder = agent_builder.temperature(temperature as f64);
        }
        
        let agent = agent_builder.build();
        
        // 执行对话
        let response = agent.prompt(&params.user_prompt).await?;

        Ok(LlmCompletionResult {
            content: response,
            token_usage: None,
        })
    }

    async fn complete_stream(
        &self,
        params: LlmCompletionParams,
        tx: tokio::sync::mpsc::Sender<LlmStreamChunk>,
    ) -> anyhow::Result<()> {
        // 使用非流式方式模拟
        let result = self.complete(params).await?;
        
        let content = result.content;
        let chunk_size = 5;
        
        for chunk in content.chars().collect::<Vec<_>>().chunks(chunk_size) {
            let chunk_str: String = chunk.iter().collect();
            tx.send(LlmStreamChunk {
                content: chunk_str,
                is_done: false,
            }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
            tokio::time::sleep(tokio::time::Duration::from_millis(30)).await;
        }
        
        tx.send(LlmStreamChunk {
            content: String::new(),
            is_done: true,
        }).await.map_err(|e| anyhow::anyhow!("Send error: {}", e))?;
        
        Ok(())
    }

    fn provider(&self) -> &str {
        "ollama"
    }

    fn model(&self) -> &str {
        &self.config.model
    }
}
