use notify::RecommendedWatcher;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

use crate::watch::watch_directory;

const DEFAULT_USER_KEYMAP: &str = "// Your personal Anvil keymap. Entries here are merged on top of\n\
// the bundled defaults — an identical key sequence overrides the\n\
// default, and \"command\": null unbinds one.\n\
[]\n";

fn keymap_path(app: &AppHandle) -> Result<PathBuf, String> {
	let dir = app.path().app_config_dir().map_err(|err| err.to_string())?;
	Ok(dir.join("keymap.jsonc"))
}

fn ensure_user_keymap(app: &AppHandle) -> Result<PathBuf, String> {
	let path = keymap_path(app)?;
	if let Some(parent) = path.parent() {
		fs::create_dir_all(parent).map_err(|err| err.to_string())?;
	}
	if !path.exists() {
		fs::write(&path, DEFAULT_USER_KEYMAP).map_err(|err| err.to_string())?;
	}
	Ok(path)
}

#[tauri::command]
pub fn read_user_keymap(app: AppHandle) -> Result<String, String> {
	let path = ensure_user_keymap(&app)?;
	fs::read_to_string(&path).map_err(|err| err.to_string())
}

/// Kept alive for the life of the app via `app.manage()` — dropping it stops
/// the underlying watch.
pub struct KeymapWatcher(#[allow(dead_code)] RecommendedWatcher);

/// Watches the user keymap file's parent directory (not the file itself — a
/// watch on the exact path can silently go dead across an atomic write, since
/// a temp-file-then-rename save replaces the inode at that path) and emits
/// `keymap://changed` when it's touched.
///
/// A failure here (e.g. an unwritable config dir) is surfaced to the
/// frontend as a toast, not fatal — the bundled default keymap still works
/// without hot reload.
pub fn watch_user_keymap(app: &AppHandle) -> Result<KeymapWatcher, String> {
	let path = ensure_user_keymap(app)?;
	let watch_dir = path
		.parent()
		.ok_or_else(|| "keymap path has no parent directory".to_string())?
		.to_path_buf();
	let file_name = path.file_name().map(|name| name.to_owned());
	let app_handle = app.clone();

	let watcher = watch_directory(
		&watch_dir,
		move |event| event.paths.iter().any(|p| p.file_name() == file_name.as_deref()),
		move || {
			let _ = app_handle.emit("keymap://changed", ());
		}
	)?;

	Ok(KeymapWatcher(watcher))
}

const DEFAULT_USER_SETTINGS: &str = "// Your personal Anvil settings. Entries here override the bundled\n\
// defaults (Preferences: Open Settings shows the full list).\n\
{}\n";

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
	let dir = app.path().app_config_dir().map_err(|err| err.to_string())?;
	Ok(dir.join("settings.jsonc"))
}

fn ensure_user_settings(app: &AppHandle) -> Result<PathBuf, String> {
	let path = settings_path(app)?;
	if let Some(parent) = path.parent() {
		fs::create_dir_all(parent).map_err(|err| err.to_string())?;
	}
	if !path.exists() {
		fs::write(&path, DEFAULT_USER_SETTINGS).map_err(|err| err.to_string())?;
	}
	Ok(path)
}

#[tauri::command]
pub fn read_user_settings(app: AppHandle) -> Result<String, String> {
	let path = ensure_user_settings(&app)?;
	fs::read_to_string(&path).map_err(|err| err.to_string())
}

/// Overwrites the user settings file wholesale. The frontend is responsible
/// for producing `contents` via a comment-preserving edit (jsonc-parser's
/// `modify`/`applyEdits`) rather than a full re-serialize, so hand-written
/// comments in the file survive a `theme.switch` or similar.
#[tauri::command]
pub fn write_user_settings(app: AppHandle, contents: String) -> Result<(), String> {
	let path = ensure_user_settings(&app)?;
	fs::write(&path, contents).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn get_settings_path(app: AppHandle) -> Result<String, String> {
	let path = ensure_user_settings(&app)?;
	Ok(path.to_string_lossy().into_owned())
}

/// Kept alive for the life of the app via `app.manage()` — dropping it stops
/// the underlying watch.
pub struct SettingsWatcher(#[allow(dead_code)] RecommendedWatcher);

/// Same rationale as `watch_user_keymap`: watches the parent directory (not
/// the file itself) and emits `settings://changed` on any touch.
pub fn watch_user_settings(app: &AppHandle) -> Result<SettingsWatcher, String> {
	let path = ensure_user_settings(app)?;
	let watch_dir = path
		.parent()
		.ok_or_else(|| "settings path has no parent directory".to_string())?
		.to_path_buf();
	let file_name = path.file_name().map(|name| name.to_owned());
	let app_handle = app.clone();

	let watcher = watch_directory(
		&watch_dir,
		move |event| event.paths.iter().any(|p| p.file_name() == file_name.as_deref()),
		move || {
			let _ = app_handle.emit("settings://changed", ());
		}
	)?;

	Ok(SettingsWatcher(watcher))
}
