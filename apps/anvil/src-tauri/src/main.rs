mod commands;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::open_folder_dialog,
            commands::open_file_dialog,
            commands::open_folder,
            commands::read_file,
            commands::save_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}