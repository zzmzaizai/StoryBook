use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, PaginatorTrait,
    QueryFilter, QueryOrder, Set,
};
use std::sync::Arc;
use chrono::Utc;

use crate::entity::characters::{self, Entity as CharacterEntity, ActiveModel as ActiveCharacter};

pub struct CharacterRepository {
    db: Arc<DatabaseConnection>,
}

impl CharacterRepository {
    pub fn new(db: Arc<DatabaseConnection>) -> Self {
        Self { db }
    }

    pub async fn create(&self, novel_id: i32, name: String) -> Result<characters::Model, sea_orm::DbErr> {
        let now = Utc::now().to_rfc3339();
        let model = ActiveCharacter {
            novel_id: Set(novel_id),
            name: Set(name),
            nickname: Set(None),
            age: Set(None),
            personality: Set(None),
            role_attribute: Set(6),
            gender: Set(3),
            character_type: Set(1),
            sort_order: Set(0),
            created_at: Set(now.clone()),
            updated_at: Set(now),
            ..Default::default()
        };

        model.insert(&*self.db).await
    }

    pub async fn find_by_id(&self, id: i32) -> Result<Option<characters::Model>, sea_orm::DbErr> {
        CharacterEntity::find_by_id(id).one(&*self.db).await
    }

    pub async fn find_by_novel(&self, novel_id: i32, page: u64, page_size: u64) -> Result<Vec<characters::Model>, sea_orm::DbErr> {
        CharacterEntity::find()
            .filter(characters::Column::NovelId.eq(novel_id))
            .order_by_asc(characters::Column::SortOrder)
            .order_by_desc(characters::Column::UpdatedAt)
            .paginate(&*self.db, page_size)
            .fetch_page(page)
            .await
    }

    pub async fn find_all_by_novel(&self, novel_id: i32) -> Result<Vec<characters::Model>, sea_orm::DbErr> {
        CharacterEntity::find()
            .filter(characters::Column::NovelId.eq(novel_id))
            .order_by_asc(characters::Column::SortOrder)
            .all(&*self.db)
            .await
    }

    pub async fn count_by_novel(&self, novel_id: i32) -> Result<u64, sea_orm::DbErr> {
        CharacterEntity::find()
            .filter(characters::Column::NovelId.eq(novel_id))
            .count(&*self.db)
            .await
    }

    pub async fn update(&self, id: i32, params: CharacterUpdateParams) -> Result<characters::Model, sea_orm::DbErr> {
        let character = CharacterEntity::find_by_id(id)
            .one(&*self.db)
            .await?
            .ok_or(sea_orm::DbErr::RecordNotFound("角色不存在".to_string()))?;

        let mut active: ActiveCharacter = character.into();
        
        if let Some(name) = params.name {
            active.name = Set(name);
        }
        if let Some(nickname) = params.nickname {
            active.nickname = Set(Some(nickname));
        }
        if let Some(age) = params.age {
            active.age = Set(Some(age));
        }
        if let Some(personality) = params.personality {
            active.personality = Set(Some(personality));
        }
        if let Some(role_attribute) = params.role_attribute {
            active.role_attribute = Set(role_attribute);
        }
        if let Some(gender) = params.gender {
            active.gender = Set(gender);
        }
        if let Some(character_type) = params.character_type {
            active.character_type = Set(character_type);
        }
        if let Some(sort_order) = params.sort_order {
            active.sort_order = Set(sort_order);
        }
        active.updated_at = Set(Utc::now().to_rfc3339());

        active.update(&*self.db).await
    }

    pub async fn delete(&self, id: i32) -> Result<(), sea_orm::DbErr> {
        CharacterEntity::delete_by_id(id).exec(&*self.db).await?;
        Ok(())
    }
}

pub struct CharacterUpdateParams {
    pub name: Option<String>,
    pub nickname: Option<String>,
    pub age: Option<String>,
    pub personality: Option<String>,
    pub role_attribute: Option<i32>,
    pub gender: Option<i32>,
    pub character_type: Option<i32>,
    pub sort_order: Option<i32>,
}
