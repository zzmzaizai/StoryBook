//! LLM 执行器
//!
//! 负责执行 LLM 调用，管理对话流程

use crate::ai::llm::factory::{
    should_retry_with_another_key, AnthropicClient, GeminiClient, OllamaClient,
    OpenAiCompatibleClient, DEFAULT_COMPLETION_TIMEOUT_SECS,
};
use crate::ai::llm::factory::{LlmClient, LlmFactory};
use crate::ai::llm::types::{LlmCompletionParams, LlmProvider, LlmRuntimeConfig};
use crate::entity::llm_config;
use rig::client::CompletionClient;
use schemars::JsonSchema;
use serde::{de::DeserializeOwned, Serialize};
use serde_json::json;
use tokio::sync::mpsc::UnboundedSender;

pub struct LlmExecutor {
    client: Box<dyn LlmClient>,
}

pub struct LlmStructuredExecutor {
    config: LlmRuntimeConfig,
}

impl LlmExecutor {
    pub fn from_config(config: &llm_config::Model) -> anyhow::Result<Self> {
        let runtime_config = LlmFactory::create_runtime_config(config);
        let client = LlmFactory::create_rig_client(&runtime_config)?;
        Ok(Self { client })
    }

    #[allow(dead_code)]
    pub async fn complete(&self, system_prompt: &str, user_prompt: &str) -> anyhow::Result<String> {
        self.complete_with_timeout(system_prompt, user_prompt, None, None)
            .await
    }

    pub async fn complete_with_timeout(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        timeout_secs: Option<u64>,
        additional_params: Option<serde_json::Value>,
    ) -> anyhow::Result<String> {
        let result = self
            .client
            .complete(LlmCompletionParams {
                system_prompt: system_prompt.to_string(),
                user_prompt: user_prompt.to_string(),
                timeout_secs,
                additional_params,
                ..Default::default()
            })
            .await?;

        Ok(result.content)
    }

    pub async fn stream_complete(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        tx: UnboundedSender<String>,
        additional_params: Option<serde_json::Value>,
    ) -> anyhow::Result<String> {
        let result = self
            .client
            .stream_complete(
                LlmCompletionParams {
                    system_prompt: system_prompt.to_string(),
                    user_prompt: user_prompt.to_string(),
                    additional_params,
                    ..Default::default()
                },
                tx,
            )
            .await?;

        Ok(result.content)
    }
}

impl LlmStructuredExecutor {
    pub fn from_config(config: &llm_config::Model) -> anyhow::Result<Self> {
        Ok(Self {
            config: LlmFactory::create_runtime_config(config),
        })
    }

    pub async fn extract_with_timeout<T>(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        timeout_secs: Option<u64>,
        retries: u64,
        additional_params: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
    {
        match LlmProvider::from(self.config.provider.as_str()) {
            LlmProvider::OpenAi => {
                let helper = OpenAiCompatibleClient::new(&self.config);
                self.extract_keyed_with_retry::<T, openai::CompletionsClient, _>(
                    |api_key| {
                        helper.build_client_with_key(
                            api_key,
                            timeout_secs.or(Some(DEFAULT_COMPLETION_TIMEOUT_SECS)),
                        )
                    },
                    system_prompt,
                    user_prompt,
                    retries,
                    additional_params.clone(),
                )
                .await
            }
            LlmProvider::Anthropic => {
                let helper = AnthropicClient::new(&self.config);
                self.extract_keyed_with_retry::<T, anthropic::Client, _>(
                    |api_key| {
                        helper.build_client_with_key(
                            api_key,
                            timeout_secs.or(Some(DEFAULT_COMPLETION_TIMEOUT_SECS)),
                        )
                    },
                    system_prompt,
                    user_prompt,
                    retries,
                    additional_params.clone(),
                )
                .await
            }
            LlmProvider::Gemini => {
                let helper = GeminiClient::new(&self.config);
                self.extract_keyed_with_retry::<T, gemini::Client, _>(
                    |api_key| {
                        helper.build_client_with_key(
                            api_key,
                            timeout_secs.or(Some(DEFAULT_COMPLETION_TIMEOUT_SECS)),
                        )
                    },
                    system_prompt,
                    user_prompt,
                    retries,
                    additional_params.clone(),
                )
                .await
            }
            LlmProvider::Ollama => {
                let helper = OllamaClient::new(&self.config);
                let client =
                    helper.build_client(timeout_secs.or(Some(DEFAULT_COMPLETION_TIMEOUT_SECS)))?;
                self.extract_with_client::<T, ollama::Client>(
                    client,
                    system_prompt,
                    user_prompt,
                    retries,
                    additional_params,
                )
                .await
            }
            LlmProvider::Other(name) => Err(anyhow::anyhow!(
                "不支持的 LLM 提供商: {}。当前支持 openai / anthropic / gemini / ollama",
                name
            )),
        }
    }

    async fn extract_keyed_with_retry<T, C, F>(
        &self,
        build_client: F,
        system_prompt: &str,
        user_prompt: &str,
        retries: u64,
        additional_params: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
        C: CompletionClient,
        F: Fn(&str) -> anyhow::Result<C>,
    {
        let first_key = self.config.effective_api_key();
        let client = build_client(&first_key)?;

        match self
            .extract_with_client::<T, C>(
                client,
                system_prompt,
                user_prompt,
                retries,
                additional_params.clone(),
            )
            .await
        {
            Ok(data) => Ok(data),
            Err(err) => {
                if should_retry_with_another_key(&err) {
                    let retry_key = self.config.random_api_key(Some(&first_key));
                    if !retry_key.is_empty() && retry_key != first_key {
                        let retry_client = build_client(&retry_key)?;
                        return self
                            .extract_with_client::<T, C>(
                                retry_client,
                                system_prompt,
                                user_prompt,
                                retries,
                                additional_params.clone(),
                            )
                            .await;
                    }
                }

                Err(err)
            }
        }
    }

    async fn extract_with_client<T, C>(
        &self,
        client: C,
        system_prompt: &str,
        user_prompt: &str,
        retries: u64,
        additional_params: Option<serde_json::Value>,
    ) -> anyhow::Result<T>
    where
        T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
        C: CompletionClient,
    {
        let mut builder = client.extractor::<T>(&self.config.model);

        if !system_prompt.trim().is_empty() {
            builder = builder.preamble(system_prompt);
        }
        if let Some(max_tokens) = self.config.max_tokens {
            builder = builder.max_tokens(max_tokens as u64);
        }
        let mut merged_additional_params = serde_json::Map::new();
        if let Some(temperature) = self.config.temperature {
            merged_additional_params.insert("temperature".to_string(), json!(temperature));
        }
        if let Some(serde_json::Value::Object(map)) = additional_params {
            for (key, value) in map {
                merged_additional_params.insert(key, value);
            }
        }
        if !merged_additional_params.is_empty() {
            builder =
                builder.additional_params(serde_json::Value::Object(merged_additional_params));
        }
        if retries > 0 {
            builder = builder.retries(retries);
        }

        let extractor = builder.build();
        extractor
            .extract(user_prompt)
            .await
            .map_err(|e| anyhow::anyhow!(e.to_string()))
    }
}

use rig::providers::{anthropic, gemini, ollama, openai};
