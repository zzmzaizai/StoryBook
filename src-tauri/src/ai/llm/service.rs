//! LLM 服务层
//!
//! 负责从数据库获取 LLM 配置，提供统一的 LLM 获取接口

use crate::entity::llm_config;
use crate::repository::LlmConfigRepository;
use sea_orm::DatabaseConnection;
use std::sync::Arc;

pub struct LlmService;

impl LlmService {
    fn repo(db: &DatabaseConnection) -> LlmConfigRepository {
        LlmConfigRepository::new(Arc::new(db.clone()))
    }

    pub async fn get_default_llm(db: &DatabaseConnection) -> anyhow::Result<llm_config::Model> {
        Self::repo(db)
            .find_default()
            .await?
            .ok_or_else(|| anyhow::anyhow!("默认 LLM 未配置"))
    }

    pub async fn get_llm_by_id(
        db: &DatabaseConnection,
        id: i32,
    ) -> anyhow::Result<llm_config::Model> {
        let model = Self::repo(db)
            .find_by_id(id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("LLM 配置不存在: {}", id))?;

        if !model.enabled {
            return Err(anyhow::anyhow!("LLM 配置已禁用: {}", id));
        }

        Ok(model)
    }

    pub async fn get_llm_for_agent(
        db: &DatabaseConnection,
        llm_config_id: Option<i32>,
    ) -> anyhow::Result<llm_config::Model> {
        match llm_config_id {
            Some(id) => Self::get_llm_by_id(db, id).await,
            None => Self::get_default_llm(db).await,
        }
    }
}
