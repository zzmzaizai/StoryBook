//! LLM 服务层
//!
//! 负责从数据库获取 LLM 配置，提供统一的 LLM 获取接口
//! 所有方法都通过 LlmConfigRepository 实现，保持架构一致

use crate::entity::llm_config;
use crate::repository::LlmConfigRepository;
use std::sync::Arc;
use sea_orm::DatabaseConnection;

/// LLM 服务
///
/// 封装 LLM 配置的数据库操作，统一通过 Repository 层访问
pub struct LlmService;

impl LlmService {
    fn get_repository(db: &DatabaseConnection) -> LlmConfigRepository {
        LlmConfigRepository::new(Arc::new(db.clone()))
    }

    /// 获取默认 LLM 配置
    ///
    /// 返回启用的默认 LLM 配置
    pub async fn get_default_llm(
        db: &DatabaseConnection,
    ) -> anyhow::Result<llm_config::Model> {
        let repo = Self::get_repository(db);
        repo.find_default()
            .await?
            .ok_or_else(|| anyhow::anyhow!("默认 LLM 未配置"))
    }

    /// 根据 ID 获取 LLM 配置
    ///
    /// # 参数
    /// - `id`: LLM 配置 ID
    ///
    /// # 返回
    /// 启用的 LLM 配置
    pub async fn get_llm_by_id(
        db: &DatabaseConnection,
        id: i32,
    ) -> anyhow::Result<llm_config::Model> {
        let repo = Self::get_repository(db);
        let model = repo
            .find_by_id(id)
            .await?
            .ok_or_else(|| anyhow::anyhow!("LLM 配置不存在: {}", id))?;

        if !model.enabled {
            return Err(anyhow::anyhow!("LLM 配置已禁用: {}", id));
        }

        Ok(model)
    }

    /// 获取 Agent 绑定的 LLM 配置
    ///
    /// 如果 Agent 绑定了特定 LLM，则返回该配置；
    /// 否则返回默认 LLM 配置。
    ///
    /// # 参数
    /// - `db`: 数据库连接
    /// - `llm_config_id`: 可选的 LLM 配置 ID
    ///
    /// # 返回
    /// LLM 配置
    pub async fn get_llm_for_agent(
        db: &DatabaseConnection,
        llm_config_id: Option<i32>,
    ) -> anyhow::Result<llm_config::Model> {
        match llm_config_id {
            Some(id) => Self::get_llm_by_id(db, id).await,
            None => Self::get_default_llm(db).await,
        }
    }

    /// 获取所有启用的 LLM 配置
    pub async fn list_enabled_llms(
        db: &DatabaseConnection,
    ) -> anyhow::Result<Vec<llm_config::Model>> {
        let repo = Self::get_repository(db);
        repo.find_enabled().await.map_err(Into::into)
    }
}
