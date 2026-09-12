mod config;
mod fs;
mod search;
mod watch;
mod workspace;

use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .manage(workspace::WatchedDirs::new())
    .manage(search::FileIndex::new())
    .invoke_handler(tauri::generate_handler![
      fs::read_file,
      fs::write_file,
      config::read_user_keymap,
      workspace::list_directory,
      workspace::watch_directory_cmd,
      workspace::unwatch_directory_cmd,
      workspace::unwatch_all_directories,
      search::index_workspace,
      search::search_files
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      match config::watch_user_keymap(&app.handle().clone()) {
        Ok(watcher) => {
          app.manage(watcher);
        }
        Err(err) => {
          log::error!("Failed to watch user keymap: {err}");
          let _ = app.handle().emit("keymap://watch-failed", err);
        }
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
