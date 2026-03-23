use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait,
    QueryFilter, QueryOrder, Set, PaginatorTrait,
};
use std::sync::Arc;
use chrono::Utc;

use crate::entity::novel_chapter_timeline::{self, Entity as TimelineEntity, ActiveModel as ActiveTimeline};

pub struct TimelineRepository {
    db: Arc<DatabaseConnection>,
}

impl TimelineRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn create(&self, novel_id: i32, title: String) -> Result<novel_chapter_timeline::Model, sea_orm::DbErr> {
        let now = Utc::now().to_rfc3339();
        let model = ActiveTimeline {
            novel_id: Set(novel_id),
            title: Set(title),
            description: Set(None),
            timeline_outline: Set(None),
            start_chapter_number: Set(None),
            end_chapter_number: Set(None),
            characters_description: Set(None),
            chapter_metas: Set(None),
            created_at: Set(now.clone()),
            updated_at: Set(now),
            ..Default::default()
        };

        model.insert(&*self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<novel_chapter_timeline::Model>, sea_orm::DbErr> {
        TimelineEntity::find_by_id(id).one(&*self.db).await
    }

    pub async fn find_by_novel(&self, novel_id: i32) -> Result<Vec<novel_chapter_timeline::Model>, sea_orm::DbErr> {
        TimelineEntity::find()
            .filter(novel_chapter_timeline::Column::NovelId.eq(novel_id))
            .order_by_asc(novel_chapter_timeline::Column::StartChapterNumber)
            .all(&*self.db)
            .await
    }

    pub async fn find_by_novel_paged(&self, novel_id: i32, page: u64, page_size: u64) -> Result<(Vec<novel_chapter_timeline::Model>, u64), sea_orm::DbErr> {
        let paginator = TimelineEntity::find()
            .filter(novel_chapter_timeline::Column::NovelId.eq(novel_id))
            .order_by_asc(novel_chapter_timeline::Column::StartChapterNumber)
            .paginate(&*self.db, page_size);

        let items = paginator.fetch_page(page).await?;
        let total = paginator.num_pages().await?;

        Ok((items, total))
    }

    pub async fn count_by_novel(&self, novel_id: i32) -> Result<u64, sea_orm::DbErr> {
        TimelineEntity::find()
            .filter(novel_chapter_timeline::Column::NovelId.eq(novel_id))
            .count(&*self.db)
            .await
    }

    pub async fn update(&self, id: i32, params: TimelineUpdateParams) -> Result<novel_chapter_timeline::Model, sea_orm::DbErr> {
        let timeline = TimelineEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound("时间线不存在".to_string()))?;

        let mut active: ActiveTimeline = timeline.into();
        
        if let Some(title) = params.title {
            active.title = Set(title);
        }
        if let Some(description) = params.description {
            active.description = Set(Some(description));
        }
        if let Some(timeline_outline) = params.timeline_outline {
            active.timeline_outline = Set(Some(timeline_outline));
        }
        if let Some(start_chapter_number) = params.start_chapter_number {
            active.start_chapter_number = Set(Some(start_chapter_number));
        }
        if let Some(end_chapter_number) = params.end_chapter_number {
            active.end_chapter_number = Set(Some(end_chapter_number));
        }
        if let Some(characters_description) = params.characters_description {
            active.characters_description = Set(Some(characters_description));
        }
        if let Some(chapter_metas) = params.chapter_metas {
            active.chapter_metas = Set(Some(chapter_metas));
        }
        active.updated_at = Set(Utc::now().to_rfc3339());

        active.update(&*self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<(), sea_orm::DbErr> {
        TimelineEntity::delete_by_id(id).exec(&*self.db).await?;
        Ok(())
    }
}

pub struct TimelineUpdateParams {
    pub title: Option<String>,
    pub description: Option<String>,
    pub timeline_outline: Option<String>,
    pub start_chapter_number: Option<i32>,
    pub end_chapter_number: Option<i32>,
    pub characters_description: Option<String>,
    pub chapter_metas: Option<String>,
}
