//! LLM 配置仓储
//!
//! 提供 LLM 配置的数据库操作，包括增删改查和默认配置管理。
//!
//! # 功能
//!
//! - 创建 LLM 配置
//! - 查询配置（单个、全部、默认）
//! - 更新配置
//! - 删除配置
//! - 设置默认配置
//! - 启用/禁用配置

use chrono::Utc;
use sea_orm::{
    prelude::Json, ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, Set,
};
use std::sync::Arc;

use crate::entity::llm_config::{self, ActiveModel as ActiveLlmConfig, Entity as LlmConfigEntity};

/// LLM 配置仓储
///
/// 封装 LLM 配置相关的数据库操作
pub struct LlmConfigRepository {
    db: Arc<DatabaseConnection>,
}

impl LlmConfigRepository {
    /// 创建新的仓储实例
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// 创建新的 LLM 配置
    ///
    /// # 参数
    ///
    /// - `params`: 创建参数
    ///
    /// # 返回
    ///
    /// 创建成功返回配置模型
    pub async fn create(
        &self,
        params: LlmConfigCreateParams,
    ) -> Result<llm_config::Model, sea_orm::DbErr> {
        let now = Utc::now().to_rfc3339();

        // 如果设置为默认，先清除其他默认配置
        if params.is_default {
            self.clear_default().await?;
        }

        let model = ActiveLlmConfig {
            id: sea_orm::ActiveValue::NotSet,
            name: Set(params.name),
            provider: Set(params.provider),
            model: Set(params.model),
            api_key: Set(params.api_key),
            base_url: Set(params.base_url),
            extra_config: Set(params.extra_config),
            is_default: Set(params.is_default),
            enabled: Set(true),
            created_at: Set(now.clone()),
            updated_at: Set(now),
        };
        model.insert(&*self.db).await
    }

    /// 根据 ID 查询配置
    pub async fn find_by_id(&self, id: i32) -> Result<Option<llm_config::Model>, sea_orm::DbErr> {
        LlmConfigEntity::find_by_id(id).one(&*self.db).await
    }

    /// 查询所有配置
    ///
    /// 按更新时间倒序排列
    pub async fn find_all(&self) -> Result<Vec<llm_config::Model>, sea_orm::DbErr> {
        LlmConfigEntity::find()
            .order_by_desc(llm_config::Column::UpdatedAt)
            .all(&*self.db)
            .await
    }

    /// 分页查询配置
    #[allow(dead_code)]
    pub async fn find_paged(
        &self,
        page: u64,
        page_size: u64,
    ) -> Result<Vec<llm_config::Model>, sea_orm::DbErr> {
        LlmConfigEntity::find()
            .order_by_desc(llm_config::Column::UpdatedAt)
            .paginate(&*self.db, page_size)
            .fetch_page(page)
            .await
    }

    /// 获取默认 LLM 配置
    ///
    /// 返回标记为默认且已启用的配置
    pub async fn find_default(&self) -> Result<Option<llm_config::Model>, sea_orm::DbErr> {
        LlmConfigEntity::find()
            .filter(llm_config::Column::IsDefault.eq(true))
            .filter(llm_config::Column::Enabled.eq(true))
            .one(&*self.db)
            .await
    }

    /// 获取所有启用的配置
    #[allow(dead_code)]
    pub async fn find_enabled(&self) -> Result<Vec<llm_config::Model>, sea_orm::DbErr> {
        LlmConfigEntity::find()
            .filter(llm_config::Column::Enabled.eq(true))
            .order_by_desc(llm_config::Column::UpdatedAt)
            .all(&*self.db)
            .await
    }

    /// 更新配置
    pub async fn update(
        &self,
        id: i32,
        params: LlmConfigUpdateParams,
    ) -> Result<llm_config::Model, sea_orm::DbErr> {
        let config = LlmConfigEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound("LLM 配置不存在".to_string()))?;

        // 如果设置为默认，先清除其他默认配置
        if params.is_default.unwrap_or(false) {
            self.clear_default().await?;
        }

        let mut active: ActiveLlmConfig = config.into();

        if let Some(name) = params.name {
            active.name = Set(name);
        }
        if let Some(provider) = params.provider {
            active.provider = Set(provider);
        }
        if let Some(model) = params.model {
            active.model = Set(model);
        }
        if let Some(api_key) = params.api_key {
            active.api_key = Set(Some(api_key));
        }
        if let Some(base_url) = params.base_url {
            active.base_url = Set(Some(base_url));
        }
        if let Some(extra_config) = params.extra_config {
            active.extra_config = Set(Some(extra_config));
        }
        if let Some(is_default) = params.is_default {
            active.is_default = Set(is_default);
        }
        if let Some(enabled) = params.enabled {
            active.enabled = Set(enabled);
        }

        active.updated_at = Set(Utc::now().to_rfc3339());
        active.update(&*self.db).await
    }

    /// 删除配置
    pub async fn delete(&self, id: i32) -> Result<(), sea_orm::DbErr> {
        LlmConfigEntity::delete_by_id(id).exec(&*self.db).await?;
        Ok(())
    }

    /// 设置默认配置
    ///
    /// 将指定配置设为默认，并清除其他配置的默认标记
    pub async fn set_default(&self, id: i32) -> Result<llm_config::Model, sea_orm::DbErr> {
        // 先清除所有默认标记
        self.clear_default().await?;

        // 设置新的默认配置
        let config = LlmConfigEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound("LLM 配置不存在".to_string()))?;

        let mut active: ActiveLlmConfig = config.into();
        active.is_default = Set(true);
        active.enabled = Set(true);
        active.updated_at = Set(Utc::now().to_rfc3339());
        active.update(&*self.db).await
    }

    /// 清除所有默认标记
    async fn clear_default(&self) -> Result<(), sea_orm::DbErr> {
        let configs = LlmConfigEntity::find()
            .filter(llm_config::Column::IsDefault.eq(true))
            .all(&*self.db)
            .await?;

        for config in configs {
            let mut active: ActiveLlmConfig = config.into();
            active.is_default = Set(false);
            active.updated_at = Set(Utc::now().to_rfc3339());
            active.update(&*self.db).await?;
        }

        Ok(())
    }

    /// 统计配置数量
    #[allow(dead_code)]
    pub async fn count(&self) -> Result<u64, sea_orm::DbErr> {
        LlmConfigEntity::find().count(&*self.db).await
    }

    /// 启用配置
    pub async fn enable(&self, id: i32) -> Result<llm_config::Model, sea_orm::DbErr> {
        self.update(
            id,
            LlmConfigUpdateParams {
                enabled: Some(true),
                ..Default::default()
            },
        )
        .await
    }

    /// 禁用配置
    pub async fn disable(&self, id: i32) -> Result<llm_config::Model, sea_orm::DbErr> {
        self.update(
            id,
            LlmConfigUpdateParams {
                enabled: Some(false),
                ..Default::default()
            },
        )
        .await
    }
}

/// LLM 配置创建参数
pub struct LlmConfigCreateParams {
    /// 配置名称
    pub name: String,
    /// 提供商
    pub provider: String,
    /// 模型名称
    pub model: String,
    /// API 密钥
    pub api_key: Option<String>,
    /// 自定义网关地址
    pub base_url: Option<String>,
    /// 额外配置
    pub extra_config: Option<Json>,
    /// 是否为默认配置
    pub is_default: bool,
}

/// LLM 配置更新参数
#[derive(Default)]
pub struct LlmConfigUpdateParams {
    /// 配置名称
    pub name: Option<String>,
    /// 提供商
    pub provider: Option<String>,
    /// 模型名称
    pub model: Option<String>,
    /// API 密钥
    pub api_key: Option<String>,
    /// 自定义网关地址
    pub base_url: Option<String>,
    /// 额外配置
    pub extra_config: Option<Json>,
    /// 是否为默认配置
    pub is_default: Option<bool>,
    /// 是否启用
    pub enabled: Option<bool>,
}
