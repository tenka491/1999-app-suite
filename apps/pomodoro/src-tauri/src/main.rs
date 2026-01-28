// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// use tauri_plugin_fs::init as fs_init;
use tauri_plugin_notification::init as notification_init;

fn main() {
    tauri::Builder::default()
        .plugin(notification_init())
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
