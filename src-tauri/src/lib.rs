mod db;
mod commands;
mod repository;
mod rig_service;
mod entity;
mod seeds;
mod constants;
mod tray;

use std::sync::Arc;
use tauri::Manager;
use commands::AppState;
use db::init_db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            
            tauri::async_runtime::block_on(async {
                let db = init_db().await.expect("数据库初始化失败");
                handle.manage(AppState { db: Arc::new(db) });
            });
            
            tray::setup_tray(app.handle())?;
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_novel,
            commands::list_novels,
            commands::count_novels,
            commands::get_novel,
            commands::update_novel,
            commands::delete_novel,
            commands::create_chapter,
            commands::list_chapters,
            commands::get_chapter,
            commands::save_chapter,
            commands::delete_chapter,
            commands::create_character,
            commands::list_characters,
            commands::get_character,
            commands::save_character,
            commands::delete_character,
            commands::create_timeline,
            commands::list_timelines,
            commands::get_timeline,
            commands::update_timeline,
            commands::delete_timeline,
            commands::get_chapter_meta_properties,
            commands::create_meta,
            commands::list_meta,
            commands::get_meta,
            commands::get_meta_by_name,
            commands::update_meta,
            commands::upsert_meta,
            commands::delete_meta,
            commands::get_novel_meta_properties,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::WindowEvent { label, event: tauri::WindowEvent::CloseRequested { api, .. }, .. } = event {
                api.prevent_close();
                if let Some(window) = app.get_webview_window(&label) {
                    let _ = window.hide();
                }
            }
        });
}
