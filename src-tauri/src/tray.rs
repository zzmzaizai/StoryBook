//! 系统托盘模块
//! 
//! 提供应用程序的系统托盘功能，允许应用在后台运行时通过托盘图标进行交互。
//! 
//! # 功能
//! 
//! - 显示应用图标和提示文本
//! - 右键菜单支持显示界面和退出应用
//! - 双击托盘图标显示主窗口
//! - 关闭窗口时隐藏而非退出
//! 
//! # 托盘菜单
//! 
//! | 菜单项 | 功能 |
//! |--------|------|
//! | 显示界面 | 显示并聚焦主窗口 |
//! | 退出 | 完全退出应用程序 |
//! 
//! # 使用示例
//! 
//! ```rust
//! use crate::tray::setup_tray;
//! 
//! // 在 Tauri 的 setup 回调中调用
//! setup_tray(app.handle())?;
//! ```

use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

/// 设置系统托盘
/// 
/// 创建系统托盘图标和右键菜单。
/// 
/// # 参数
/// 
/// - `app`: Tauri 应用句柄
/// 
/// # 返回
/// 
/// - `Ok(())`: 托盘创建成功
/// - `Err(Box<dyn std::error::Error>)`: 托盘创建失败
/// 
/// # 功能说明
/// 
/// 1. 创建托盘菜单项：
///    - "显示界面" - 显示主窗口
///    - 分隔线
///    - "退出" - 退出应用
/// 
/// 2. 设置托盘图标（使用 32x32.png）
/// 
/// 3. 设置提示文本 "AI 小说编辑器"
/// 
/// 4. 绑定事件处理：
///    - 菜单点击事件
///    - 托盘图标双击事件
/// 
/// # 示例
/// 
/// ```rust
/// // 在 lib.rs 的 setup 中调用
/// .setup(|app| {
///     tray::setup_tray(app.handle())?;
///     Ok(())
/// })
/// ```
pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // 创建菜单项
    // "显示界面" 菜单项 - 用于显示主窗口
    let show = MenuItemBuilder::with_id("show", "显示界面").build(app)?;
    
    // 分隔线 - 用于视觉分隔菜单项
    let separator = PredefinedMenuItem::separator(app)?;
    
    // "退出" 菜单项 - 用于完全退出应用
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

    // 构建托盘菜单
    // 菜单项顺序：显示界面 -> 分隔线 -> 退出
    let menu = MenuBuilder::new(app)
        .item(&show)
        .item(&separator)
        .item(&quit)
        .build()?;

    // 加载托盘图标
    // 使用嵌入的 32x32.png 图片资源
    let icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))?;

    // 构建托盘图标
    let _tray = TrayIconBuilder::new()
        .icon(icon)                                    // 设置图标
        .tooltip("AI 小说编辑器")                       // 设置提示文本
        .menu(&menu)                                   // 绑定菜单
        .on_menu_event(move |app, event| {             // 菜单事件处理
            handle_menu_event(app, event.id().as_ref());
        })
        .on_tray_icon_event(|tray, event| {            // 托盘图标事件处理
            // 双击托盘图标时显示主窗口
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                if let Some(window) = tray.app_handle().get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// 处理托盘菜单事件
/// 
/// 根据菜单项 ID 执行相应的操作。
/// 
/// # 参数
/// 
/// - `app`: Tauri 应用句柄
/// - `id`: 菜单项 ID
/// 
/// # 支持的操作
/// 
/// | ID | 操作 |
/// |----|------|
/// | `show` | 显示、取消最小化并聚焦主窗口 |
/// | `quit` | 退出应用程序（退出码 0） |
fn handle_menu_event(app: &AppHandle, id: &str) {
    match id {
        // 显示主窗口
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();           // 显示窗口
                let _ = window.unminimize();     // 取消最小化
                let _ = window.set_focus();      // 设置焦点
            }
        }
        // 退出应用
        "quit" => {
            app.exit(0);  // 正常退出
        }
        // 忽略其他菜单项
        _ => {}
    }
}
