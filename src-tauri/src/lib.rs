mod ai;
mod app_window;
mod commands;
mod constants;
mod db;
mod entity;
mod repository;
mod seeds;
mod storage;
mod tray;

use commands::AppState;
use db::init_db;
use std::sync::Arc;
use storage::StorageManager;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            app_window::focus_main_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let handle = app.handle().clone();

            tauri::async_runtime::block_on(async {
                let storage = StorageManager::new().expect("存储目录初始化失败");
                storage.init_directories().expect("目录结构创建失败");

                let db = init_db(&storage).await.expect("数据库初始化失败");
                handle.manage(AppState { db: Arc::new(db) });
                handle.manage(storage);
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
            commands::get_novel_settings,
            commands::save_novel_settings,
            commands::ai_generate_novel_info,
            commands::create_chapter,
            commands::list_chapters,
            commands::get_chapter,
            commands::get_next_chapter_number,
            commands::save_chapter,
            commands::delete_chapter,
            commands::ai_generate_chapter_stream,
            commands::create_character,
            commands::list_characters,
            commands::get_character,
            commands::save_character,
            commands::delete_character,
            commands::ai_generate_character,
            commands::create_timeline,
            commands::list_timelines,
            commands::list_timelines_paged,
            commands::get_timeline,
            commands::update_timeline,
            commands::delete_timeline,
            commands::ai_generate_timeline,
            commands::get_chapter_meta_properties,
            commands::create_meta,
            commands::list_meta,
            commands::list_meta_paged,
            commands::get_meta,
            commands::get_meta_by_name,
            commands::update_meta,
            commands::upsert_meta,
            commands::delete_meta,
            commands::ai_generate_meta_stream,
            commands::get_novel_meta_properties,
            // LLM Config commands
            commands::list_llm_configs,
            commands::get_llm_config,
            commands::get_default_llm_config,
            commands::create_llm_config,
            commands::update_llm_config,
            commands::delete_llm_config,
            commands::set_default_llm_config,
            commands::enable_llm_config,
            commands::disable_llm_config,
            // Agent Config commands
            commands::list_agent_definitions,
            commands::get_agent_definition,
            commands::save_agent_runtime_config,
            commands::reset_agent_runtime_config,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            #[cfg(debug_assertions)]
            if let tauri::RunEvent::Ready = event {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            if let tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::CloseRequested { api, .. },
                ..
            } = event
            {
                api.prevent_close();
                if let Some(window) = app.get_webview_window(&label) {
                    let _ = window.hide();
                }
            }
        });
}
