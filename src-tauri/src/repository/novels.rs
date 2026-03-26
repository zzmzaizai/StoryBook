use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, Set,
};
use std::sync::Arc;

use crate::entity::chapters::Entity as ChapterEntity;
use crate::entity::characters::Entity as CharacterEntity;
use crate::entity::novels::{self, ActiveModel as ActiveNovel, Entity as NovelEntity};

pub struct NovelRepository {
    db: Arc<DatabaseConnection>,
}

impl NovelRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn create(&self, title: String) -> Result<novels::Model, sea_orm::DbErr> {
        let now = Utc::now().to_rfc3339();
        let model = ActiveNovel {
            title: Set(title),
            description: Set(None),
            image: Set(None),
            original_description: Set(None),
            style: Set(1),
            target_audience: Set(4),
            length_type: Set(3),
            estimated_chapter_count: Set(None),
            estimated_total_word_count: Set(None),
            estimated_words_per_chapter: Set(None),
            total_word_count: Set(0),
            status: Set(1),
            created_at: Set(now.clone()),
            updated_at: Set(now),
            ..Default::default()
        };
        model.insert(&*self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<novels::Model>, sea_orm::DbErr> {
        NovelEntity::find_by_id(id).one(&*self.db).await
    }

    pub async fn find_all(
        &self,
        page: u64,
        page_size: u64,
    ) -> Result<Vec<novels::Model>, sea_orm::DbErr> {
        NovelEntity::find()
            .order_by_desc(novels::Column::UpdatedAt)
            .paginate(&*self.db, page_size)
            .fetch_page(page)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        params: NovelUpdateParams,
    ) -> Result<novels::Model, sea_orm::DbErr> {
        let novel = NovelEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound("小说不存在".to_string()))?;

        let mut active: ActiveNovel = novel.into();
        if let Some(title) = params.title {
            active.title = Set(title);
        }
        if let Some(description) = params.description {
            active.description = Set(Some(description));
        }
        if let Some(original_description) = params.original_description {
            active.original_description = Set(Some(original_description));
        }
        if let Some(image) = params.image {
            active.image = Set(Some(image));
        }
        if let Some(style) = params.style {
            active.style = Set(style);
        }
        if let Some(target_audience) = params.target_audience {
            active.target_audience = Set(target_audience);
        }
        if let Some(length_type) = params.length_type {
            active.length_type = Set(length_type);
        }
        if let Some(estimated_chapter_count) = params.estimated_chapter_count {
            active.estimated_chapter_count = Set(Some(estimated_chapter_count));
        }
        if let Some(estimated_total_word_count) = params.estimated_total_word_count {
            active.estimated_total_word_count = Set(Some(estimated_total_word_count));
        }
        if let Some(estimated_words_per_chapter) = params.estimated_words_per_chapter {
            active.estimated_words_per_chapter = Set(Some(estimated_words_per_chapter));
        }
        if let Some(status) = params.status {
            active.status = Set(status);
        }
        active.updated_at = Set(Utc::now().to_rfc3339());

        active.update(&*self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<(), sea_orm::DbErr> {
        CharacterEntity::delete_many()
            .filter(crate::entity::characters::Column::NovelId.eq(id))
            .exec(&*self.db)
            .await?;

        ChapterEntity::delete_many()
            .filter(crate::entity::chapters::Column::NovelId.eq(id))
            .exec(&*self.db)
            .await?;

        NovelEntity::delete_by_id(id).exec(&*self.db).await?;
        Ok(())
    }

    pub async fn count(&self) -> Result<u64, sea_orm::DbErr> {
        NovelEntity::find().count(&*self.db).await
    }
}

pub struct NovelUpdateParams {
    pub title: Option<String>,
    pub description: Option<String>,
    pub original_description: Option<String>,
    pub image: Option<String>,
    pub style: Option<i32>,
    pub target_audience: Option<i32>,
    pub length_type: Option<i32>,
    pub estimated_chapter_count: Option<i32>,
    pub estimated_total_word_count: Option<i64>,
    pub estimated_words_per_chapter: Option<i32>,
    pub status: Option<i32>,
}
