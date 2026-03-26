use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait, QueryFilter,
    QueryOrder, Set,
};
use std::sync::Arc;

use crate::entity::chapters::{self, ActiveModel as ActiveChapter, Entity as ChapterEntity};

pub struct ChapterRepository {
    db: Arc<DatabaseConnection>,
}

impl ChapterRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn create(
        &self,
        novel_id: i32,
        chapter_name: String,
    ) -> Result<chapters::Model, sea_orm::DbErr> {
        let now = Utc::now().to_rfc3339();

        let max_chapter = ChapterEntity::find()
            .filter(chapters::Column::NovelId.eq(novel_id))
            .order_by_desc(chapters::Column::ChapterNumber)
            .one(&*self.db)
            .await?;

        let chapter_number = match max_chapter {
            Some(ch) => ch.chapter_number + 1,
            None => 1,
        };

        let model = ActiveChapter {
            novel_id: Set(novel_id),
            chapter_number: Set(chapter_number),
            chapter_name: Set(chapter_name),
            content: Set(None),
            word_count: Set(0),
            version: Set(1),
            status: Set(0),
            created_at: Set(now.clone()),
            updated_at: Set(now),
            ..Default::default()
        };

        model.insert(&*self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<chapters::Model>, sea_orm::DbErr> {
        ChapterEntity::find_by_id(id).one(&*self.db).await
    }

    pub async fn find_by_novel(
        &self,
        novel_id: i32,
        page: u64,
        page_size: u64,
    ) -> Result<Vec<chapters::Model>, sea_orm::DbErr> {
        ChapterEntity::find()
            .filter(chapters::Column::NovelId.eq(novel_id))
            .order_by_asc(chapters::Column::ChapterNumber)
            .paginate(&*self.db, page_size)
            .fetch_page(page)
            .await
    }

    #[allow(dead_code)]
    pub async fn find_all_by_novel(
        &self,
        novel_id: i32,
    ) -> Result<Vec<chapters::Model>, sea_orm::DbErr> {
        ChapterEntity::find()
            .filter(chapters::Column::NovelId.eq(novel_id))
            .order_by_asc(chapters::Column::ChapterNumber)
            .all(&*self.db)
            .await
    }

    pub async fn count_by_novel(&self, novel_id: i32) -> Result<u64, sea_orm::DbErr> {
        ChapterEntity::find()
            .filter(chapters::Column::NovelId.eq(novel_id))
            .count(&*self.db)
            .await
    }

    pub async fn update(
        &self,
        id: i32,
        params: ChapterUpdateParams,
    ) -> Result<chapters::Model, sea_orm::DbErr> {
        let chapter = ChapterEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound("章节不存在".to_string()))?;

        let mut active: ActiveChapter = chapter.into();

        if let Some(chapter_name) = params.chapter_name {
            active.chapter_name = Set(chapter_name);
        }
        if let Some(content) = params.content {
            let word_count = content.chars().count() as i32;
            active.content = Set(Some(content));
            active.word_count = Set(word_count);
        }
        if let Some(status) = params.status {
            active.status = Set(status);
        }
        if let Some(increment_version) = params.increment_version {
            if increment_version {
                active.version = Set(active.version.unwrap() + 1);
            }
        }
        active.updated_at = Set(Utc::now().to_rfc3339());

        active.update(&*self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<(), sea_orm::DbErr> {
        ChapterEntity::delete_by_id(id).exec(&*self.db).await?;
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn sum_word_count_by_novel(&self, novel_id: i32) -> Result<i64, sea_orm::DbErr> {
        let chapters = self.find_all_by_novel(novel_id).await?;
        Ok(chapters.iter().map(|c| c.word_count as i64).sum())
    }
}

pub struct ChapterUpdateParams {
    pub chapter_name: Option<String>,
    pub content: Option<String>,
    pub status: Option<i32>,
    pub increment_version: Option<bool>,
}
