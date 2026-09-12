use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

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

/// True for event kinds that mean the file's content on disk may actually
/// have changed. Explicitly excludes `Access` — reading the file (which the
/// frontend does every time it loads the keymap) fires an Access event on
/// Linux, and treating that as a change created a read → event → read loop.
fn is_content_change(kind: &EventKind) -> bool {
	matches!(kind, EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_))
}

/// Watches the user keymap file's parent directory (not the file itself —
/// see the module doc below) and emits `keymap://changed`, debounced by
/// hand since notify-debouncer-mini doesn't filter by event kind and would
/// reintroduce the Access-event loop.
///
/// A failure here (e.g. an unwritable config dir) is logged, not fatal — the
/// bundled default keymap still works without hot reload.
pub fn watch_user_keymap(app: &AppHandle) -> Result<KeymapWatcher, String> {
	let path = ensure_user_keymap(app)?;
	let watch_dir = path
		.parent()
		.ok_or_else(|| "keymap path has no parent directory".to_string())?
		.to_path_buf();
	let file_name = path.file_name().map(|name| name.to_owned());
	let app_handle = app.clone();
	let epoch = Arc::new(AtomicU64::new(0));

	let mut watcher = notify::recommended_watcher(move |result: notify::Result<Event>| {
		let Ok(event) = result else { return };
		if !is_content_change(&event.kind) {
			return;
		}
		if !event.paths.iter().any(|p| p.file_name() == file_name.as_deref()) {
			return;
		}

		let this_epoch = epoch.fetch_add(1, Ordering::SeqCst) + 1;
		let epoch = epoch.clone();
		let app_handle = app_handle.clone();
		tauri::async_runtime::spawn_blocking(move || {
			std::thread::sleep(Duration::from_millis(300));
			if epoch.load(Ordering::SeqCst) == this_epoch {
				let _ = app_handle.emit("keymap://changed", ());
			}
		});
	})
	.map_err(|err| err.to_string())?;

	watcher.watch(&watch_dir, RecursiveMode::NonRecursive).map_err(|err| err.to_string())?;

	Ok(KeymapWatcher(watcher))
}
