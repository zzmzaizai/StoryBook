//! Agent 配置仓储
//!
//! 提供 Agent 配置的数据库操作，包括增删改查和 Agent 代码查询。
//!
//! # 功能
//!
//! - 创建 Agent 配置
//! - 查询配置（单个、全部、按代码）
//! - 更新配置
//! - 删除配置
//! - 启用/禁用配置
//! - 初始化默认 Agent 配置

use chrono::Utc;
use sea_orm::{
    prelude::Json, ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, Set,
};
use std::sync::Arc;

use crate::entity::agent_config::{
    self, ActiveModel as ActiveAgentConfig, AgentCodes, Entity as AgentConfigEntity,
};

/// Agent 配置仓储
///
/// 封装 Agent 配置相关的数据库操作
pub struct AgentConfigRepository {
    db: Arc<DatabaseConnection>,
}

impl AgentConfigRepository {
    /// 创建新的仓储实例
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    /// 创建新的 Agent 配置
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
        params: AgentConfigCreateParams,
    ) -> Result<agent_config::Model, sea_orm::DbErr> {
        if AgentCodes::is_builtin(&params.agent_code) {
            let existing = self.find_by_agent_code(&params.agent_code).await?;
            if existing.is_some() {
                return Err(sea_orm::DbErr::Custom(format!(
                    "内置 Agent 已存在，不能重复创建: {}",
                    params.agent_code
                )));
            }
        }

        let now = Utc::now().to_rfc3339();

        let model = ActiveAgentConfig {
            id: sea_orm::ActiveValue::NotSet,
            agent_code: Set(params.agent_code),
            name: Set(params.name),
            description: Set(params.description),
            llm_config_id: Set(params.llm_config_id),
            custom_prompt: Set(params.custom_prompt),
            use_system_prompt: Set(params.use_system_prompt),
            enabled: Set(true),
            extra_config: Set(params.extra_config),
            created_at: Set(now.clone()),
            updated_at: Set(now),
        };
        model.insert(&*self.db).await
    }

    /// 根据 ID 查询配置
    pub async fn find_by_id(&self, id: i32) -> Result<Option<agent_config::Model>, sea_orm::DbErr> {
        AgentConfigEntity::find_by_id(id).one(&*self.db).await
    }

    /// 根据 Agent 代码查询配置
    ///
    /// 用于根据 agent_code 路由到具体配置
    pub async fn find_by_agent_code(
        &self,
        agent_code: &str,
    ) -> Result<Option<agent_config::Model>, sea_orm::DbErr> {
        AgentConfigEntity::find()
            .filter(agent_config::Column::AgentCode.eq(agent_code))
            .one(&*self.db)
            .await
    }

    /// 查询所有配置
    ///
    /// 按更新时间倒序排列
    pub async fn find_all(&self) -> Result<Vec<agent_config::Model>, sea_orm::DbErr> {
        AgentConfigEntity::find()
            .order_by_desc(agent_config::Column::UpdatedAt)
            .all(&*self.db)
            .await
    }

    /// 分页查询配置
    #[allow(dead_code)]
    pub async fn find_paged(
        &self,
        page: u64,
        page_size: u64,
    ) -> Result<Vec<agent_config::Model>, sea_orm::DbErr> {
        AgentConfigEntity::find()
            .order_by_desc(agent_config::Column::UpdatedAt)
            .paginate(&*self.db, page_size)
            .fetch_page(page)
            .await
    }

    /// 更新配置
    pub async fn update(
        &self,
        id: i32,
        params: AgentConfigUpdateParams,
    ) -> Result<agent_config::Model, sea_orm::DbErr> {
        let config = AgentConfigEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound(
                "Agent 配置不存在".to_string(),
            ))?;

        let mut active: ActiveAgentConfig = config.into();

        if let Some(agent_code) = params.agent_code {
            active.agent_code = Set(agent_code);
        }
        if let Some(name) = params.name {
            active.name = Set(name);
        }
        if let Some(description) = params.description {
            active.description = Set(description);
        }
        if let Some(llm_config_id) = params.llm_config_id {
            active.llm_config_id = Set(llm_config_id);
        }
        if let Some(custom_prompt) = params.custom_prompt {
            active.custom_prompt = Set(custom_prompt);
        }
        if let Some(use_system_prompt) = params.use_system_prompt {
            active.use_system_prompt = Set(use_system_prompt);
        }
        if let Some(extra_config) = params.extra_config {
            active.extra_config = Set(extra_config);
        }

        active.updated_at = Set(Utc::now().to_rfc3339());
        active.update(&*self.db).await
    }

    /// 删除配置
    pub async fn delete(&self, id: i32) -> Result<(), sea_orm::DbErr> {
        let config = AgentConfigEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound(
                "Agent 配置不存在".to_string(),
            ))?;

        if AgentCodes::is_builtin(&config.agent_code) {
            return Err(sea_orm::DbErr::Custom(format!(
                "内置 Agent 不允许删除: {}",
                config.agent_code
            )));
        }

        AgentConfigEntity::delete_by_id(id).exec(&*self.db).await?;
        Ok(())
    }

    /// 统计配置数量
    #[allow(dead_code)]
    pub async fn count(&self) -> Result<u64, sea_orm::DbErr> {
        AgentConfigEntity::find().count(&*self.db).await
    }

    /// 绑定 LLM 配置
    ///
    /// 将指定 Agent 绑定到特定的 LLM 配置
    pub async fn bind_llm(
        &self,
        id: i32,
        llm_config_id: Option<i32>,
    ) -> Result<agent_config::Model, sea_orm::DbErr> {
        self.update(
            id,
            AgentConfigUpdateParams {
                llm_config_id: Some(llm_config_id),
                ..Default::default()
            },
        )
        .await
    }

    /// 设置自定义提示词
    pub async fn set_custom_prompt(
        &self,
        id: i32,
        custom_prompt: Option<String>,
    ) -> Result<agent_config::Model, sea_orm::DbErr> {
        self.update(
            id,
            AgentConfigUpdateParams {
                custom_prompt: Some(custom_prompt),
                ..Default::default()
            },
        )
        .await
    }

    /// 初始化默认 Agent 配置
    ///
    /// 为所有预定义的 Agent 创建默认配置
    pub async fn init_default_agents(&self) -> Result<(), sea_orm::DbErr> {
        for code in AgentCodes::all() {
            // 检查是否已存在
            let existing = self.find_by_agent_code(code).await?;
            if existing.is_none() {
                let name = AgentCodes::get_default_name(code).to_string();
                self.create(AgentConfigCreateParams {
                    agent_code: code.to_string(),
                    name,
                    description: Some(AgentCodes::get_default_description(code).to_string()),
                    llm_config_id: None,
                    custom_prompt: None,
                    use_system_prompt: true,
                    extra_config: None,
                })
                .await?;
            }
        }
        Ok(())
    }

    pub async fn reset_builtin_agent(
        &self,
        id: i32,
    ) -> Result<agent_config::Model, sea_orm::DbErr> {
        let config = AgentConfigEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound(
                "Agent 配置不存在".to_string(),
            ))?;

        let agent_code = config.agent_code.clone();

        if !AgentCodes::is_builtin(&agent_code) {
            return Err(sea_orm::DbErr::Custom(format!(
                "仅内置 Agent 支持重置: {}",
                agent_code
            )));
        }

        let mut active: ActiveAgentConfig = config.into();
        active.name = Set(AgentCodes::get_default_name(&agent_code).to_string());
        active.description = Set(Some(
            AgentCodes::get_default_description(&agent_code).to_string(),
        ));
        active.llm_config_id = Set(None);
        active.custom_prompt = Set(None);
        active.use_system_prompt = Set(true);
        active.enabled = Set(true);
        active.extra_config = Set(None);
        active.updated_at = Set(Utc::now().to_rfc3339());
        active.update(&*self.db).await
    }
}

/// Agent 配置创建参数
pub struct AgentConfigCreateParams {
    /// Agent 唯一标识码
    pub agent_code: String,
    /// 显示名称
    pub name: String,
    /// 描述信息
    pub description: Option<String>,
    /// 绑定的 LLM 配置 ID
    pub llm_config_id: Option<i32>,
    /// 用户自定义提示词
    pub custom_prompt: Option<String>,
    /// 是否使用系统提示词
    pub use_system_prompt: bool,
    /// Agent 专属配置
    pub extra_config: Option<Json>,
}

/// Agent 配置更新参数
#[derive(Default)]
pub struct AgentConfigUpdateParams {
    /// Agent 唯一标识码
    pub agent_code: Option<String>,
    /// 显示名称
    pub name: Option<String>,
    /// 描述信息
    pub description: Option<Option<String>>,
    /// 绑定的 LLM 配置 ID
    pub llm_config_id: Option<Option<i32>>,
    /// 用户自定义提示词
    pub custom_prompt: Option<Option<String>>,
    /// 是否使用系统提示词
    pub use_system_prompt: Option<bool>,
    /// Agent 专属配置
    pub extra_config: Option<Option<Json>>,
}
