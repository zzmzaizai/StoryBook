//! 存储管理模块
//! 
//! 提供跨平台的应用数据存储管理功能，统一管理应用数据的存储位置。
//! 
//! # 目录结构
//! 
//! 应用数据存储在用户主目录下的 `.storybook` 文件夹中：
//! 
//! ```text
//! ~/.storybook/
//! ├── db/                    # 数据库目录
//! │   └── database.db        # SQLite 数据库文件
//! ├── novels/                # 小说数据目录
//! │   └── {novel_id}/        # 按 ID 分组的小说目录
//! │       ├── image/         # 小说图片（封面、插图等）
//! │       └── export/        # 导出文件（EPUB、PDF 等）
//! ├── config/                # 应用配置目录
//! ├── cache/                 # 缓存目录
//! └── logs/                  # 日志目录
//! ```
//! 
//! # 跨平台路径
//! 
//! | 平台 | 路径 |
//! |------|------|
//! | Windows | `C:\Users\{UserName}\.storybook` |
//! | Linux | `/home/{username}/.storybook` |
//! | macOS | `/Users/{username}/.storybook` |
//! 
//! # 使用示例
//! 
//! ```rust
//! use crate::storage::StorageManager;
//! 
//! // 创建存储管理器实例
//! let storage = StorageManager::new()?;
//! 
//! // 初始化所有目录
//! storage.init_directories()?;
//! 
//! // 获取数据库路径
//! let db_path = storage.get_db_path();
//! 
//! // 获取小说图片目录
//! let image_dir = storage.get_novel_image_dir(1);
//! ```

use std::path::PathBuf;
use std::fs;
use std::io;

/// 应用数据目录名称
/// 
/// 在用户主目录下创建的文件夹名称，以 `.` 开头表示隐藏目录
pub const APP_DATA_DIR: &str = ".storybook";

/// 存储管理器
/// 
/// 管理应用数据的存储位置，提供统一的路径访问接口。
/// 所有数据存储在用户主目录下的 `.storybook` 文件夹中。
/// 
/// # 特性
/// 
/// - 自动创建不存在的目录
/// - 提供类型安全的路径访问
/// - 支持跨平台路径解析
#[derive(Debug, Clone)]
pub struct StorageManager {
    /// 基础存储路径（~/.storybook）
    base_path: PathBuf,
}

impl StorageManager {
    /// 创建新的存储管理器实例
    /// 
    /// 自动获取用户主目录并创建应用数据目录（如果不存在）。
    /// 
    /// # 返回
    /// 
    /// - `Ok(StorageManager)` - 成功创建存储管理器
    /// - `Err(io::Error)` - 无法获取用户主目录或创建目录失败
    /// 
    /// # 示例
    /// 
    /// ```rust
    /// let storage = StorageManager::new()?;
    /// ```
    pub fn new() -> Result<Self, io::Error> {
        let base_path = Self::get_app_data_dir()?;
        
        if !base_path.exists() {
            fs::create_dir_all(&base_path)?;
        }
        
        Ok(Self { base_path })
    }

    /// 获取应用数据目录路径
    /// 
    /// 返回用户主目录下的 `.storybook` 文件夹路径。
    /// 
    /// # 跨平台行为
    /// 
    /// - Windows: `C:\Users\{UserName}\.storybook`
    /// - Linux: `/home/{username}/.storybook`
    /// - macOS: `/Users/{username}/.storybook`
    /// 
    /// # 错误
    /// 
    /// 如果无法获取用户主目录，返回 `io::ErrorKind::NotFound` 错误。
    pub fn get_app_data_dir() -> Result<PathBuf, io::Error> {
        let home_dir = dirs::home_dir()
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "无法获取用户主目录"))?;
        
        Ok(home_dir.join(APP_DATA_DIR))
    }

    /// 获取数据库文件路径
    /// 
    /// 返回 `~/.storybook/db/database.db` 路径。
    /// 如果目录不存在，会自动创建。
    /// 
    /// # 返回路径
    /// 
    /// `{base_path}/db/database.db`
    pub fn get_db_path(&self) -> PathBuf {
        let db_dir = self.base_path.join("db");
        if !db_dir.exists() {
            fs::create_dir_all(&db_dir).ok();
        }
        db_dir.join("database.db")
    }

    /// 获取小说数据目录
    /// 
    /// 返回指定小说的数据目录路径。
    /// 
    /// # 参数
    /// 
    /// - `novel_id`: 小说 ID
    /// 
    /// # 返回路径
    /// 
    /// `{base_path}/novels/{novel_id}/`
    pub fn get_novel_dir(&self, novel_id: i32) -> PathBuf {
        self.base_path.join("novels").join(novel_id.to_string())
    }

    /// 获取小说图片目录
    /// 
    /// 用于存储小说封面、插图等图片文件。
    /// 如果目录不存在，会自动创建。
    /// 
    /// # 参数
    /// 
    /// - `novel_id`: 小说 ID
    /// 
    /// # 返回路径
    /// 
    /// `{base_path}/novels/{novel_id}/image/`
    pub fn get_novel_image_dir(&self, novel_id: i32) -> PathBuf {
        let image_dir = self.get_novel_dir(novel_id).join("image");
        if !image_dir.exists() {
            fs::create_dir_all(&image_dir).ok();
        }
        image_dir
    }

    /// 获取小说导出目录
    /// 
    /// 用于存储导出的 EPUB、PDF 等文件。
    /// 如果目录不存在，会自动创建。
    /// 
    /// # 参数
    /// 
    /// - `novel_id`: 小说 ID
    /// 
    /// # 返回路径
    /// 
    /// `{base_path}/novels/{novel_id}/export/`
    pub fn get_novel_export_dir(&self, novel_id: i32) -> PathBuf {
        let export_dir = self.get_novel_dir(novel_id).join("export");
        if !export_dir.exists() {
            fs::create_dir_all(&export_dir).ok();
        }
        export_dir
    }

    /// 获取应用配置目录
    /// 
    /// 用于存储应用级别的配置文件（如用户偏好设置）。
    /// 如果目录不存在，会自动创建。
    /// 
    /// # 返回路径
    /// 
    /// `{base_path}/config/`
    pub fn get_config_dir(&self) -> PathBuf {
        let config_dir = self.base_path.join("config");
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).ok();
        }
        config_dir
    }

    /// 获取缓存目录
    /// 
    /// 用于存储临时缓存数据，可以被安全删除。
    /// 如果目录不存在，会自动创建。
    /// 
    /// # 返回路径
    /// 
    /// `{base_path}/cache/`
    pub fn get_cache_dir(&self) -> PathBuf {
        let cache_dir = self.base_path.join("cache");
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir).ok();
        }
        cache_dir
    }

    /// 获取日志目录
    /// 
    /// 用于存储应用运行日志。
    /// 如果目录不存在，会自动创建。
    /// 
    /// # 返回路径
    /// 
    /// `{base_path}/logs/`
    pub fn get_logs_dir(&self) -> PathBuf {
        let logs_dir = self.base_path.join("logs");
        if !logs_dir.exists() {
            fs::create_dir_all(&logs_dir).ok();
        }
        logs_dir
    }

    /// 初始化所有目录结构
    /// 
    /// 创建应用所需的所有目录：
    /// - `db/` - 数据库目录
    /// - `novels/` - 小说数据目录
    /// - `config/` - 配置目录
    /// - `cache/` - 缓存目录
    /// - `logs/` - 日志目录
    /// 
    /// # 错误
    /// 
    /// 如果创建任何目录失败，返回相应的 `io::Error`。
    /// 
    /// # 示例
    /// 
    /// ```rust
    /// let storage = StorageManager::new()?;
    /// storage.init_directories()?;
    /// ```
    pub fn init_directories(&self) -> Result<(), io::Error> {
        let dirs = vec![
            self.base_path.join("db"),
            self.base_path.join("novels"),
            self.base_path.join("config"),
            self.base_path.join("cache"),
            self.base_path.join("logs"),
        ];

        for dir in dirs {
            if !dir.exists() {
                fs::create_dir_all(&dir)?;
            }
        }

        Ok(())
    }

    /// 获取基础存储路径
    /// 
    /// 返回应用数据目录的根路径。
    /// 
    /// # 返回
    /// 
    /// `~/.storybook` 路径的引用
    pub fn base_path(&self) -> &PathBuf {
        &self.base_path
    }
}

/// 默认实现
/// 
/// 提供便捷的默认初始化方式。
/// 注意：如果初始化失败会 panic，建议使用 `new()` 方法处理错误。
impl Default for StorageManager {
    fn default() -> Self {
        Self::new().expect("无法初始化存储管理器")
    }
}
