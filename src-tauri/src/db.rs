use sea_orm::{Database, DatabaseConnection, Statement, ConnectionTrait, EntityTrait, Set, ActiveModelTrait, PaginatorTrait};
use chrono::Utc;
use crate::storage::StorageManager;

pub async fn init_db(storage: &StorageManager) -> Result<DatabaseConnection, sea_orm::DbErr> {
    let db_path = storage.get_db_path();
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
    let db = Database::connect(&db_url).await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS novels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            image TEXT,
            original_description TEXT,
            style INTEGER DEFAULT 1,
            target_audience INTEGER DEFAULT 4,
            length_type INTEGER DEFAULT 3,
            is_focus INTEGER DEFAULT 0,
            estimated_chapter_count INTEGER,
            estimated_total_word_count INTEGER,
            estimated_words_per_chapter INTEGER,
            total_word_count INTEGER DEFAULT 0,
            status INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#.to_string(),
    )).await?;

    migrate_novels_table(&db).await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS chapters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            chapter_number INTEGER DEFAULT 0,
            chapter_name TEXT NOT NULL,
            content TEXT,
            word_count INTEGER DEFAULT 0,
            version INTEGER DEFAULT 1,
            status INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#.to_string(),
    )).await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS characters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            nickname TEXT,
            age TEXT,
            personality TEXT,
            role_attribute INTEGER DEFAULT 6,
            gender INTEGER DEFAULT 3,
            character_type INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#.to_string(),
    )).await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS novel_meta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            property_name TEXT NOT NULL,
            property_description TEXT,
            property_value TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#.to_string(),
    )).await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS novel_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            setting_key TEXT NOT NULL,
            setting_value TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#.to_string(),
    )).await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS novel_chapter_meta (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chapter_id INTEGER NOT NULL,
            property_name TEXT NOT NULL,
            property_value TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#.to_string(),
    )).await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS novel_chapter_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            chapter_id INTEGER NOT NULL,
            chapter_number INTEGER DEFAULT 0,
            chapter_name TEXT NOT NULL,
            content TEXT,
            word_count INTEGER DEFAULT 0,
            version INTEGER DEFAULT 1,
            status INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#.to_string(),
    )).await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS novel_chapter_version (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chapter_id INTEGER NOT NULL,
            version INTEGER DEFAULT 1,
            meta_property_name TEXT NOT NULL,
            modification_suggestion TEXT,
            chapter_name TEXT NOT NULL,
            content TEXT,
            is_activated INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#.to_string(),
    )).await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS novel_chapter_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            timeline_outline TEXT,
            start_chapter_number INTEGER,
            end_chapter_number INTEGER,
            characters_description TEXT,
            chapter_metas TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#.to_string(),
    )).await?;

    init_seed_data(&db).await?;

    Ok(db)
}

async fn migrate_novels_table(db: &DatabaseConnection) -> Result<(), sea_orm::DbErr> {
    let columns_to_check = [
        ("description", "TEXT"),
        ("image", "TEXT"),
        ("original_description", "TEXT"),
        ("style", "INTEGER DEFAULT 1"),
        ("target_audience", "INTEGER DEFAULT 4"),
        ("length_type", "INTEGER DEFAULT 3"),
        ("is_focus", "INTEGER DEFAULT 0"),
        ("estimated_chapter_count", "INTEGER"),
        ("estimated_total_word_count", "INTEGER"),
        ("estimated_words_per_chapter", "INTEGER"),
        ("total_word_count", "INTEGER DEFAULT 0"),
        ("status", "INTEGER DEFAULT 1"),
    ];

    for (column_name, column_def) in columns_to_check {
        let check_sql = format!(
            "SELECT COUNT(*) FROM pragma_table_info('novels') WHERE name='{}'",
            column_name
        );
        
        let result: i64 = db
            .query_one(Statement::from_string(
                db.get_database_backend(),
                check_sql,
            ))
            .await?
            .map(|row| row.try_get::<i64>("", "COUNT(*)").unwrap_or(0))
            .unwrap_or(0);

        if result == 0 {
            let alter_sql = format!("ALTER TABLE novels ADD COLUMN {} {}", column_name, column_def);
            db.execute(Statement::from_string(
                db.get_database_backend(),
                alter_sql,
            )).await?;
        }
    }

    Ok(())
}

async fn init_seed_data(db: &DatabaseConnection) -> Result<(), sea_orm::DbErr> {
    use crate::entity::novels::Entity as Novels;
    use crate::entity::novels::ActiveModel as ActiveNovel;
    use crate::entity::chapters::ActiveModel as ActiveChapter;
    use crate::entity::characters::ActiveModel as ActiveCharacter;

    let novels_count: u64 = Novels::find().count(db).await?;
    if novels_count > 0 {
        return Ok(());
    }

    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let novel_seeds = crate::seeds::get_novel_seeds();
    let mut novel_ids: Vec<i32> = Vec::new();

    for seed in novel_seeds {
        let novel = ActiveNovel {
            id: sea_orm::ActiveValue::NotSet,
            title: Set(seed.title),
            description: Set(seed.description),
            image: Set(seed.image),
            original_description: Set(None),
            style: Set(seed.style),
            target_audience: Set(seed.target_audience),
            length_type: Set(seed.length_type),
            is_focus: Set(seed.is_focus),
            estimated_chapter_count: Set(seed.estimated_chapter_count),
            estimated_total_word_count: Set(seed.estimated_total_word_count),
            estimated_words_per_chapter: Set(seed.estimated_words_per_chapter),
            total_word_count: Set(0),
            status: Set(seed.status),
            created_at: Set(now.clone()),
            updated_at: Set(now.clone()),
        };
        let inserted = novel.insert(db).await?;
        novel_ids.push(inserted.id);
    }

    let chapter_seeds = crate::seeds::get_chapter_seeds();
    for seed in chapter_seeds {
        if seed.novel_index < novel_ids.len() {
            let chapter = ActiveChapter {
                id: sea_orm::ActiveValue::NotSet,
                novel_id: Set(novel_ids[seed.novel_index]),
                chapter_number: Set(seed.chapter_number),
                chapter_name: Set(seed.chapter_name),
                content: Set(seed.content),
                word_count: Set(seed.word_count),
                version: Set(1),
                status: Set(seed.status),
                created_at: Set(now.clone()),
                updated_at: Set(now.clone()),
            };
            chapter.insert(db).await?;
        }
    }

    let character_seeds = crate::seeds::get_character_seeds();
    for seed in character_seeds {
        if seed.novel_index < novel_ids.len() {
            let character = ActiveCharacter {
                id: sea_orm::ActiveValue::NotSet,
                novel_id: Set(novel_ids[seed.novel_index]),
                name: Set(seed.name),
                nickname: Set(seed.nickname),
                age: Set(seed.age),
                personality: Set(seed.personality),
                role_attribute: Set(seed.role_attribute),
                gender: Set(seed.gender),
                character_type: Set(seed.character_type),
                sort_order: Set(seed.sort_order),
                created_at: Set(now.clone()),
                updated_at: Set(now.clone()),
            };
            character.insert(db).await?;
        }
    }

    Ok(())
}
