use crate::ai::agent::service::AgentService;
use schemars::JsonSchema;
use sea_orm::DatabaseConnection;
use serde::{de::DeserializeOwned, Serialize};
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct StructuredGenerationOptions {
    pub timeout_secs: Option<u64>,
    pub retries: u64,
}

impl StructuredGenerationOptions {
    pub const fn new(timeout_secs: Option<u64>, retries: u64) -> Self {
        Self {
            timeout_secs,
            retries,
        }
    }
}

pub async fn generate_structured<T>(
    db: &DatabaseConnection,
    agent_code: &str,
    structured_input: Value,
    options: StructuredGenerationOptions,
) -> anyhow::Result<T>
where
    T: JsonSchema + DeserializeOwned + Serialize + Send + Sync + 'static,
{
    AgentService::invoke_structured_with_timeout::<T>(
        db,
        agent_code,
        structured_input,
        options.timeout_secs,
        options.retries,
    )
    .await
    .map_err(|err| {
        anyhow::anyhow!(
            "结构化结果生成失败: agent_code={} error={}",
            agent_code,
            err
        )
    })
}
