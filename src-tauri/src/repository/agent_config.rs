use chrono::Utc;
use sea_orm::{
    prelude::Json, ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, Set,
};
use std::sync::Arc;

use crate::entity::agent_config::{
    self, ActiveModel as ActiveAgentConfig, Entity as AgentConfigEntity,
};

pub struct AgentConfigRepository {
    db: Arc<DatabaseConnection>,
}

impl AgentConfigRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn find_by_agent_code(
        &self,
        agent_code: &str,
    ) -> Result<Option<agent_config::Model>, sea_orm::DbErr> {
        AgentConfigEntity::find()
            .filter(agent_config::Column::AgentCode.eq(agent_code))
            .one(&*self.db)
            .await
    }

    pub async fn find_all(&self) -> Result<Vec<agent_config::Model>, sea_orm::DbErr> {
        AgentConfigEntity::find()
            .order_by_asc(agent_config::Column::AgentCode)
            .all(&*self.db)
            .await
    }

    pub async fn upsert(
        &self,
        params: AgentRuntimeConfigUpsertParams,
    ) -> Result<agent_config::Model, sea_orm::DbErr> {
        if let Some(existing) = self.find_by_agent_code(&params.agent_code).await? {
            let mut active: ActiveAgentConfig = existing.into();
            active.llm_config_id = Set(params.llm_config_id);
            active.extra_config = Set(params.extra_config);
            active.updated_at = Set(Utc::now().to_rfc3339());
            return active.update(&*self.db).await;
        }

        let now = Utc::now().to_rfc3339();
        let model = ActiveAgentConfig {
            id: sea_orm::ActiveValue::NotSet,
            agent_code: Set(params.agent_code),
            llm_config_id: Set(params.llm_config_id),
            extra_config: Set(params.extra_config),
            created_at: Set(now.clone()),
            updated_at: Set(now),
        };
        model.insert(&*self.db).await
    }

    pub async fn delete_by_agent_code(&self, agent_code: &str) -> Result<(), sea_orm::DbErr> {
        if let Some(existing) = self.find_by_agent_code(agent_code).await? {
            let active: ActiveAgentConfig = existing.into();
            active.delete(&*self.db).await?;
        }
        Ok(())
    }
}

pub struct AgentRuntimeConfigUpsertParams {
    pub agent_code: String,
    pub llm_config_id: Option<i32>,
    pub extra_config: Option<Json>,
}
