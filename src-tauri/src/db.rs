//! 数据库模块
//!
//! 提供数据库初始化、表结构创建和数据迁移功能。
//! 使用 SQLite 作为数据存储引擎，通过 Sea-ORM 进行 ORM 操作。
//!
//! # 数据表结构
//!
//! | 表名 | 说明 |
//! |------|------|
//! | `novels` | 小说主表 |
//! | `chapters` | 章节表 |
//! | `characters` | 角色表 |
//! | `novel_meta` | 小说元数据表 |
//! | `novel_settings` | 小说设置表 |
//! | `novel_chapter_meta` | 章节元数据表 |
//! | `novel_chapter_history` | 章节历史表 |
//! | `novel_chapter_version` | 章节版本表 |
//! | `novel_chapter_timeline` | 时间线表 |
//! | `llm_config` | LLM 配置表 |
//! | `agent_config` | Agent 配置表 |
//!
//! # 使用示例
//!
//! ```rust
//! use crate::storage::StorageManager;
//! use crate::db::init_db;
//!
//! let storage = StorageManager::new()?;
//! let db = init_db(&storage).await?;
//! ```

use crate::storage::StorageManager;
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ConnectionTrait, Database, DatabaseConnection, EntityTrait, PaginatorTrait,
    Set, Statement,
};

/// 初始化数据库连接和表结构
///
/// 创建 SQLite 数据库连接，并初始化所有必要的数据表。
/// 数据库文件存储在 `~/.storybook/db/database.db`。
///
/// # 参数
///
/// - `storage`: 存储管理器实例，用于获取数据库路径
///
/// # 返回
///
/// - `Ok(DatabaseConnection)`: 成功返回数据库连接
/// - `Err(DbErr)`: 数据库操作失败
///
/// # 初始化流程
///
/// 1. 创建数据库连接（如果文件不存在会自动创建）
/// 2. 创建 `novels` 表（小说主表）
/// 3. 执行 novels 表迁移（添加新字段）
/// 4. 创建 `chapters` 表（章节表）
/// 5. 创建 `characters` 表（角色表）
/// 6. 创建 `novel_meta` 表（小说元数据）
/// 7. 创建 `novel_settings` 表（小说设置）
/// 8. 创建 `novel_chapter_meta` 表（章节元数据）
/// 9. 创建 `novel_chapter_history` 表（章节历史）
/// 10. 创建 `novel_chapter_version` 表（章节版本）
/// 11. 创建 `novel_chapter_timeline` 表（时间线）
/// 12. 初始化种子数据（如果是新数据库）
///
/// # 示例
///
/// ```rust
/// let storage = StorageManager::new()?;
/// let db = init_db(&storage).await?;
/// ```
pub async fn init_db(storage: &StorageManager) -> Result<DatabaseConnection, sea_orm::DbErr> {
    let db_path = storage.get_db_path();
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
    let db = Database::connect(&db_url).await?;

    // 创建小说主表
    // 存储小说的基本信息，包括标题、描述、风格、状态等
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
            estimated_chapter_count INTEGER,
            estimated_total_word_count INTEGER,
            estimated_words_per_chapter INTEGER,
            total_word_count INTEGER DEFAULT 0,
            status INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#
        .to_string(),
    ))
    .await?;

    // 执行 novels 表迁移（添加新字段）
    migrate_novels_table(&db).await?;

    // 创建章节表
    // 存储小说的章节内容，包括章节号、标题、内容、字数等
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
        "#
        .to_string(),
    ))
    .await?;

    // 创建角色表
    // 存储小说中的角色信息，包括姓名、年龄、性格、角色属性等
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
        "#
        .to_string(),
    ))
    .await?;

    // 创建小说元数据表
    // 存储小说的自定义元数据属性
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
        "#
        .to_string(),
    ))
    .await?;

    // 创建小说设置表
    // 存储小说的配置项
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
        "#
        .to_string(),
    ))
    .await?;

    // 创建章节元数据表
    // 存储章节的自定义属性
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
        "#
        .to_string(),
    ))
    .await?;

    // 创建章节历史表
    // 存储章节的历史版本记录
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
        "#
        .to_string(),
    ))
    .await?;

    // 创建章节版本表
    // 存储章节的 AI 生成版本
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
        "#
        .to_string(),
    ))
    .await?;

    // 创建时间线表
    // 存储小说时间线的标题、正文和章节范围
    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS novel_chapter_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            start_chapter_number INTEGER,
            end_chapter_number INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#
        .to_string(),
    ))
    .await?;

    migrate_timeline_table(&db).await?;

    // 创建 LLM 配置表
    // 存储大语言模型的配置信息，支持多个 Provider 和 Model
    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS llm_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            api_key TEXT,
            base_url TEXT,
            extra_config TEXT,
            is_default INTEGER DEFAULT 0,
            enabled INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#
        .to_string(),
    ))
    .await?;

    // 创建 Agent 配置表
    // 存储 AI Agent 的配置信息，支持绑定指定 LLM 或使用默认 LLM
    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE IF NOT EXISTS agent_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_code TEXT NOT NULL UNIQUE,
            llm_config_id INTEGER,
            extra_config TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#
        .to_string(),
    ))
    .await?;

    // 初始化种子数据
    init_seed_data(&db).await?;

    Ok(db)
}

/// 迁移 novels 表结构
///
/// 检查并添加 novels 表中可能缺失的字段。
/// 这是为了兼容旧版本的数据库结构。
///
/// # 参数
///
/// - `db`: 数据库连接
///
/// # 迁移的字段
///
/// - `description` - 小说描述
/// - `image` - 封面图片路径
/// - `original_description` - 原始描述
/// - `style` - 小说风格
/// - `target_audience` - 目标读者
/// - `length_type` - 篇幅类型
/// - `estimated_chapter_count` - 预计章节数
/// - `estimated_total_word_count` - 预计总字数
/// - `estimated_words_per_chapter` - 预计每章字数
/// - `total_word_count` - 总字数
/// - `status` - 状态
async fn migrate_novels_table(db: &DatabaseConnection) -> Result<(), sea_orm::DbErr> {
    // 需要检查的字段列表：字段名 -> 字段定义
    let columns_to_check = [
        ("description", "TEXT"),
        ("image", "TEXT"),
        ("original_description", "TEXT"),
        ("style", "INTEGER DEFAULT 1"),
        ("target_audience", "INTEGER DEFAULT 4"),
        ("length_type", "INTEGER DEFAULT 3"),
        ("estimated_chapter_count", "INTEGER"),
        ("estimated_total_word_count", "INTEGER"),
        ("estimated_words_per_chapter", "INTEGER"),
        ("total_word_count", "INTEGER DEFAULT 0"),
        ("status", "INTEGER DEFAULT 1"),
    ];

    // 遍历每个字段，检查是否存在，不存在则添加
    for (column_name, column_def) in columns_to_check {
        // 使用 SQLite 的 pragma_table_info 检查字段是否存在
        let check_sql = format!(
            "SELECT COUNT(*) FROM pragma_table_info('novels') WHERE name='{}'",
            column_name
        );

        let result: i64 = db
            .query_one(Statement::from_string(db.get_database_backend(), check_sql))
            .await?
            .map(|row| row.try_get::<i64>("", "COUNT(*)").unwrap_or(0))
            .unwrap_or(0);

        // 如果字段不存在，使用 ALTER TABLE 添加
        if result == 0 {
            let alter_sql = format!(
                "ALTER TABLE novels ADD COLUMN {} {}",
                column_name, column_def
            );
            db.execute(Statement::from_string(db.get_database_backend(), alter_sql))
                .await?;
        }
    }

    Ok(())
}

async fn migrate_timeline_table(db: &DatabaseConnection) -> Result<(), sea_orm::DbErr> {
    let content_exists_sql =
        "SELECT COUNT(*) FROM pragma_table_info('novel_chapter_timeline') WHERE name='content'";

    let content_exists: i64 = db
        .query_one(Statement::from_string(
            db.get_database_backend(),
            content_exists_sql.to_string(),
        ))
        .await?
        .map(|row| row.try_get::<i64>("", "COUNT(*)").unwrap_or(0))
        .unwrap_or(0);

    if content_exists > 0 {
        return Ok(());
    }

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        ALTER TABLE novel_chapter_timeline RENAME TO novel_chapter_timeline_old;
        "#
        .to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        CREATE TABLE novel_chapter_timeline (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            novel_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            start_chapter_number INTEGER,
            end_chapter_number INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        "#
        .to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"
        INSERT INTO novel_chapter_timeline (
            id,
            novel_id,
            title,
            content,
            start_chapter_number,
            end_chapter_number,
            created_at,
            updated_at
        )
        SELECT
            id,
            novel_id,
            title,
            TRIM(
                COALESCE(
                    NULLIF(
                        (CASE
                            WHEN description IS NOT NULL AND TRIM(description) <> ''
                            THEN '概述：' || TRIM(description) || char(10) || char(10)
                            ELSE ''
                        END) ||
                        COALESCE(NULLIF(TRIM(timeline_outline), ''), '') ||
                        (CASE
                            WHEN characters_description IS NOT NULL AND TRIM(characters_description) <> ''
                            THEN char(10) || char(10) || '涉及角色：' || TRIM(characters_description)
                            ELSE ''
                        END),
                        ''
                    ),
                    ''
                )
            ),
            start_chapter_number,
            end_chapter_number,
            created_at,
            updated_at
        FROM novel_chapter_timeline_old;
        "#
        .to_string(),
    ))
    .await?;

    db.execute(Statement::from_string(
        db.get_database_backend(),
        r#"DROP TABLE novel_chapter_timeline_old;"#.to_string(),
    ))
    .await?;

    Ok(())
}

/// 初始化种子数据
///
/// 如果数据库是新建的（novels 表为空），则插入示例数据。
/// 包括示例小说、章节和角色数据。
///
/// # 参数
///
/// - `db`: 数据库连接
///
/// # 种子数据
///
/// - 小说：从 `seeds` 模块获取的示例小说
/// - 章节：每个小说的示例章节
/// - 角色：每个小说的示例角色
async fn init_seed_data(db: &DatabaseConnection) -> Result<(), sea_orm::DbErr> {
    use crate::entity::chapters::ActiveModel as ActiveChapter;
    use crate::entity::characters::ActiveModel as ActiveCharacter;
    use crate::entity::novels::ActiveModel as ActiveNovel;
    use crate::entity::novels::Entity as Novels;

    // 检查是否已有数据，避免重复插入
    let novels_count: u64 = Novels::find().count(db).await?;
    if novels_count > 0 {
        return Ok(());
    }

    // 获取当前时间戳
    let now = Utc::now().format("%Y-%m-%d %H:%M:%S").to_string();

    // 获取小说种子数据
    let novel_seeds = crate::seeds::get_novel_seeds();
    let mut novel_ids: Vec<i32> = Vec::new();

    // 插入小说数据
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

    // 插入章节数据
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

    // 插入角色数据
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
