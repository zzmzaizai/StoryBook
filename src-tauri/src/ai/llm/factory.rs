//! LLM 工厂类
//!
//! 使用 RIG 原生客户端创建逻辑
//! 支持两种 OpenAI API：
//! - openai: Chat Completions API (/chat/completions)
//! - openai_responses: Responses API (/responses)

use crate::ai::llm::types::{CompletionResult, LlmConfig, StreamChunk};
use futures::StreamExt;
use rig::completion::GetTokenUsage;
use rig::completion::CompletionModel;
use rig::completion::Prompt;
use rig::client::CompletionClient;
use rig::providers;
use rig::streaming::{StreamedAssistantContent, StreamingPrompt, ToolCallDeltaContent};

/// Chat Completions API Agent 类型
pub type ChatCompletionsAgent = rig::agent::Agent<providers::openai::completion::CompletionModel>;
type ChatCompletionsStreamingResponse = <providers::openai::completion::CompletionModel as CompletionModel>::StreamingResponse;

/// Responses API Agent 类型
pub type ResponsesApiAgent = rig::agent::Agent<providers::openai::responses_api::ResponsesCompletionModel>;
type ResponsesApiStreamingResponse = <providers::openai::responses_api::ResponsesCompletionModel as CompletionModel>::StreamingResponse;

/// 统一的 Agent 枚举
pub enum RigAgent {
    ChatCompletions(ChatCompletionsAgent),
    ResponsesApi(ResponsesApiAgent),
}

/// LLM 执行器
///
/// 封装 RIG Agent，提供统一的调用接口
pub struct LlmExecutor {
    config: LlmConfig,
}

impl LlmExecutor {
    pub fn new(config: &LlmConfig) -> anyhow::Result<Self> {
        Ok(Self {
            config: config.clone(),
        })
    }

    pub fn from_db_config(config: &crate::entity::llm_config::Model) -> anyhow::Result<Self> {
        Self::new(&LlmConfig::from(config))
    }

    pub async fn complete(
        &self,
        system_prompt: &str,
        user_prompt: &str,
    ) -> anyhow::Result<CompletionResult> {
        match self.build_agent(system_prompt)? {
            RigAgent::ChatCompletions(agent) => {
                let content = agent.prompt(user_prompt).await?;
                Ok(CompletionResult::new(content))
            }
            RigAgent::ResponsesApi(agent) => {
                let content = agent.prompt(user_prompt).await?;
                Ok(CompletionResult::new(content))
            }
        }
    }

    pub async fn complete_stream_channel(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        tx: tokio::sync::mpsc::Sender<StreamChunk>,
    ) -> anyhow::Result<()> {
        match self.build_agent(system_prompt)? {
            RigAgent::ChatCompletions(agent) => {
                let mut stream = agent.stream_prompt(user_prompt).await;
                while let Some(chunk) = stream.next().await {
                    match chunk {
                        Ok(item) => {
                            for c in collect_chat_completions_chunks(item) {
                                tx.send(c).await?;
                            }
                        }
                        Err(e) => {
                            tx.send(StreamChunk::error(e.to_string())).await?;
                        }
                    }
                }
            }
            RigAgent::ResponsesApi(agent) => {
                let mut stream = agent.stream_prompt(user_prompt).await;
                while let Some(chunk) = stream.next().await {
                    match chunk {
                        Ok(item) => {
                            for c in collect_responses_api_chunks(item) {
                                tx.send(c).await?;
                            }
                        }
                        Err(e) => {
                            tx.send(StreamChunk::error(e.to_string())).await?;
                        }
                    }
                }
            }
        }
        tx.send(StreamChunk::done()).await?;
        Ok(())
    }

    fn build_agent(&self, system_prompt: &str) -> anyhow::Result<RigAgent> {
        let api_key = self.config.random_api_key();
        let base_url = self.config.effective_base_url();

        if self.config.provider.uses_responses_api() {
            let mut client_builder = providers::openai::Client::builder().api_key(&api_key);
            if base_url != "https://api.openai.com/v1" {
                client_builder = client_builder.base_url(&base_url);
            }
            let client = client_builder
                .build()
                .map_err(|e| anyhow::anyhow!("Failed to create Responses API client: {}", e))?;
            
            let mut builder = client.agent(&self.config.model);
            if !system_prompt.is_empty() {
                builder = builder.preamble(system_prompt);
            }
            if let Some(temp) = self.config.temperature {
                builder = builder.temperature(temp);
            }
            Ok(RigAgent::ResponsesApi(builder.build()))
        } else {
            let mut client_builder = providers::openai::CompletionsClient::builder().api_key(&api_key);
            if base_url != "https://api.openai.com/v1" {
                client_builder = client_builder.base_url(&base_url);
            }
            let client = client_builder
                .build()
                .map_err(|e| anyhow::anyhow!("Failed to create Chat Completions client: {}", e))?;
            
            let mut builder = client.agent(&self.config.model);
            if !system_prompt.is_empty() {
                builder = builder.preamble(system_prompt);
            }
            if let Some(temp) = self.config.temperature {
                builder = builder.temperature(temp);
            }
            Ok(RigAgent::ChatCompletions(builder.build()))
        }
    }

    pub fn provider(&self) -> &str {
        self.config.provider.as_str()
    }

    pub fn model(&self) -> &str {
        &self.config.model
    }
}

fn collect_chat_completions_chunks(
    item: rig::agent::MultiTurnStreamItem<ChatCompletionsStreamingResponse>,
) -> Vec<StreamChunk> {
    match item {
        rig::agent::MultiTurnStreamItem::StreamAssistantItem(content) => {
            match content {
                StreamedAssistantContent::Text(text) => vec![StreamChunk::text(text.text)],
                StreamedAssistantContent::ToolCallDelta { content, .. } => match content {
                    ToolCallDeltaContent::Name(name) => vec![StreamChunk::tool_name(name)],
                    ToolCallDeltaContent::Delta(delta) => vec![StreamChunk::tool_delta(delta)],
                },
                StreamedAssistantContent::Reasoning(reasoning) => {
                    vec![StreamChunk::reasoning(format!("{:?}", reasoning))]
                }
                StreamedAssistantContent::ReasoningDelta { reasoning, .. } => {
                    vec![StreamChunk::reasoning_delta(reasoning)]
                }
                StreamedAssistantContent::ToolCall { tool_call, .. } => {
                    vec![StreamChunk::tool_name(tool_call.function.name)]
                }
                StreamedAssistantContent::Final(response) => {
                    response.token_usage()
                        .map(|u| StreamChunk::usage(token_usage_from_rig(u)))
                        .into_iter()
                        .collect()
                }
            }
        }
        rig::agent::MultiTurnStreamItem::FinalResponse(final_response) => {
            vec![StreamChunk::usage(token_usage_from_rig(final_response.usage()))]
        }
        _ => Vec::new(),
    }
}

fn collect_responses_api_chunks(
    item: rig::agent::MultiTurnStreamItem<ResponsesApiStreamingResponse>,
) -> Vec<StreamChunk> {
    match item {
        rig::agent::MultiTurnStreamItem::StreamAssistantItem(content) => {
            match content {
                StreamedAssistantContent::Text(text) => vec![StreamChunk::text(text.text)],
                StreamedAssistantContent::ToolCallDelta { content, .. } => match content {
                    ToolCallDeltaContent::Name(name) => vec![StreamChunk::tool_name(name)],
                    ToolCallDeltaContent::Delta(delta) => vec![StreamChunk::tool_delta(delta)],
                },
                StreamedAssistantContent::Reasoning(reasoning) => {
                    vec![StreamChunk::reasoning(format!("{:?}", reasoning))]
                }
                StreamedAssistantContent::ReasoningDelta { reasoning, .. } => {
                    vec![StreamChunk::reasoning_delta(reasoning)]
                }
                StreamedAssistantContent::ToolCall { tool_call, .. } => {
                    vec![StreamChunk::tool_name(tool_call.function.name)]
                }
                StreamedAssistantContent::Final(response) => {
                    response.token_usage()
                        .map(|u| StreamChunk::usage(token_usage_from_rig(u)))
                        .into_iter()
                        .collect()
                }
            }
        }
        rig::agent::MultiTurnStreamItem::FinalResponse(final_response) => {
            vec![StreamChunk::usage(token_usage_from_rig(final_response.usage()))]
        }
        _ => Vec::new(),
    }
}

fn token_usage_from_rig(usage: rig::completion::Usage) -> crate::ai::llm::TokenUsage {
    crate::ai::llm::TokenUsage {
        prompt_tokens: usage.input_tokens,
        completion_tokens: usage.output_tokens,
        total_tokens: usage.total_tokens,
    }
}

pub struct LlmExecutorBuilder {
    config: Option<LlmConfig>,
}

impl LlmExecutorBuilder {
    pub fn new() -> Self {
        Self { config: None }
    }

    pub fn with_config(mut self, config: LlmConfig) -> Self {
        self.config = Some(config);
        self
    }

    pub fn with_db_config(mut self, config: crate::entity::llm_config::Model) -> Self {
        self.config = Some(LlmConfig::from(config));
        self
    }

    pub fn build(self) -> anyhow::Result<LlmExecutor> {
        let config = self.config.ok_or_else(|| anyhow::anyhow!("LLM config required"))?;
        LlmExecutor::new(&config)
    }
}

impl Default for LlmExecutorBuilder {
    fn default() -> Self {
        Self::new()
    }
}