use std::fs;
use tauri::Window;
use tauri_plugin_dialog::{FileDialogBuilder, FilePath};

#[tauri::command]
pub async fn open_file_dialog(window: Window) -> Option<String> {
    let file_path = tokio::sync::oneshot::channel();

    let (tx, rx) = tokio::sync::oneshot::channel();

    FileDialogBuilder::new(&window).pick_file(move |file| {
        let _ = tx.send(file);
    });

    match rx.await {
        Ok(Some(path)) => match path {
            FilePath::PathBuf(pb) => Some(pb.to_string_lossy().to_string()),
            FilePath::String(s) => Some(s),
        },
        _ => None,
    }
}

#[tauri::command]
pub async fn open_folder_dialog(window: Window) -> Option<String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    FileDialogBuilder::new(&window).pick_folder(move |folder| {
        let _ = tx.send(folder);
    });

    match rx.await {
        Ok(Some(path)) => match path {
            FilePath::PathBuf(pb) => Some(pb.to_string_lossy().to_string()),
            FilePath::String(s) => Some(s),
        },
        _ => None,
    }
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_file(path: String, contents: String) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| e.to_string())
}
