use std::path::PathBuf;
use std::fs;
use std::io;

pub const APP_DATA_DIR: &str = ".storybook";

#[derive(Debug, Clone)]
pub struct StorageManager {
    base_path: PathBuf,
}

impl StorageManager {
    pub fn new() -> Result<Self, io::Error> {
        let base_path = Self::get_app_data_dir()?;
        
        if !base_path.exists() {
            fs::create_dir_all(&base_path)?;
        }
        
        Ok(Self { base_path })
    }

    pub fn get_app_data_dir() -> Result<PathBuf, io::Error> {
        let home_dir = dirs::home_dir()
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "无法获取用户主目录"))?;
        
        Ok(home_dir.join(APP_DATA_DIR))
    }

    pub fn get_db_path(&self) -> PathBuf {
        let db_dir = self.base_path.join("db");
        if !db_dir.exists() {
            fs::create_dir_all(&db_dir).ok();
        }
        db_dir.join("database.db")
    }

    pub fn get_novel_dir(&self, novel_id: i32) -> PathBuf {
        self.base_path.join("novels").join(novel_id.to_string())
    }

    pub fn get_novel_image_dir(&self, novel_id: i32) -> PathBuf {
        let image_dir = self.get_novel_dir(novel_id).join("image");
        if !image_dir.exists() {
            fs::create_dir_all(&image_dir).ok();
        }
        image_dir
    }

    pub fn get_novel_export_dir(&self, novel_id: i32) -> PathBuf {
        let export_dir = self.get_novel_dir(novel_id).join("export");
        if !export_dir.exists() {
            fs::create_dir_all(&export_dir).ok();
        }
        export_dir
    }

    pub fn get_config_dir(&self) -> PathBuf {
        let config_dir = self.base_path.join("config");
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).ok();
        }
        config_dir
    }

    pub fn get_cache_dir(&self) -> PathBuf {
        let cache_dir = self.base_path.join("cache");
        if !cache_dir.exists() {
            fs::create_dir_all(&cache_dir).ok();
        }
        cache_dir
    }

    pub fn get_logs_dir(&self) -> PathBuf {
        let logs_dir = self.base_path.join("logs");
        if !logs_dir.exists() {
            fs::create_dir_all(&logs_dir).ok();
        }
        logs_dir
    }

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

    pub fn base_path(&self) -> &PathBuf {
        &self.base_path
    }
}

impl Default for StorageManager {
    fn default() -> Self {
        Self::new().expect("无法初始化存储管理器")
    }
}
