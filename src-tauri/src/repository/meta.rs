use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, Set,
};
use std::sync::Arc;

use crate::entity::novel_meta::{self, ActiveModel as ActiveMeta, Entity as MetaEntity};

pub struct MetaRepository {
    db: Arc<DatabaseConnection>,
}

impl MetaRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        novel_id: i32,
        property_name: String,
        property_value: Option<String>,
    ) -> Result<novel_meta::Model, sea_orm::DbErr> {
        let now = Utc::now().to_rfc3339();
        let model = ActiveMeta {
            novel_id: Set(novel_id),
            property_name: Set(property_name),
            property_description: Set(None),
            property_value: Set(property_value),
            created_at: Set(now.clone()),
            updated_at: Set(now),
            ..Default::default()
        };

        model.insert(&*self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<novel_meta::Model>, sea_orm::DbErr> {
        MetaEntity::find_by_id(id).one(&*self.db).await
    }

    pub async fn find_by_novel(
        &self,
        novel_id: i32,
    ) -> Result<Vec<novel_meta::Model>, sea_orm::DbErr> {
        MetaEntity::find()
            .filter(novel_meta::Column::NovelId.eq(novel_id))
            .order_by_asc(novel_meta::Column::Id)
            .all(&*self.db)
            .await
    }

    pub async fn find_by_novel_paged(
        &self,
        novel_id: i32,
        page: u64,
        page_size: u64,
    ) -> Result<(Vec<novel_meta::Model>, u64), sea_orm::DbErr> {
        let paginator = MetaEntity::find()
            .filter(novel_meta::Column::NovelId.eq(novel_id))
            .order_by_asc(novel_meta::Column::Id)
            .paginate(&*self.db, page_size);

        let items = paginator.fetch_page(page).await?;
        let total = paginator.num_pages().await?;

        Ok((items, total))
    }

    pub async fn count_by_novel(&self, novel_id: i32) -> Result<u64, sea_orm::DbErr> {
        MetaEntity::find()
            .filter(novel_meta::Column::NovelId.eq(novel_id))
            .count(&*self.db)
            .await
    }

    pub async fn find_by_novel_and_name(
        &self,
        novel_id: i32,
        property_name: &str,
    ) -> Result<Option<novel_meta::Model>, sea_orm::DbErr> {
        MetaEntity::find()
            .filter(novel_meta::Column::NovelId.eq(novel_id))
            .filter(novel_meta::Column::PropertyName.eq(property_name))
            .one(&*self.db)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        property_value: Option<String>,
    ) -> Result<novel_meta::Model, sea_orm::DbErr> {
        let meta = MetaEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound("元数据不存在".to_string()))?;

        let mut active: ActiveMeta = meta.into();
        active.property_value = Set(property_value);
        active.updated_at = Set(Utc::now().to_rfc3339());

        active.update(&*self.db).await
    }

    pub async fn upsert(
        &self,
        novel_id: i32,
        property_name: String,
        property_value: Option<String>,
    ) -> Result<novel_meta::Model, sea_orm::DbErr> {
        if let Some(existing) = self
            .find_by_novel_and_name(novel_id, &property_name)
            .await?
        {
            self.update(existing.id, property_value).await
        } else {
            self.create(novel_id, property_name, property_value).await
        }
    }

    pub async fn delete(&self, id: i32) -> Result<(), sea_orm::DbErr> {
        MetaEntity::delete_by_id(id).exec(&*self.db).await?;
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn delete_by_novel(&self, novel_id: i32) -> Result<(), sea_orm::DbErr> {
        MetaEntity::delete_many()
            .filter(novel_meta::Column::NovelId.eq(novel_id))
            .exec(&*self.db)
            .await?;
        Ok(())
    }
}
