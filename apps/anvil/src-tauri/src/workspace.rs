use ignore::WalkBuilder;
use serde::Serialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

use crate::watch::watch_directory;

// Hidden regardless of .gitignore — these are never useful in the sidebar
// and can be huge (PRD §4.1 Rust responsibilities).
const ALWAYS_HIDDEN: &[&str] = &[".git", "node_modules", "target", "_build", "deps"];

#[derive(Serialize)]
pub struct DirEntry {
	name: String,
	path: String,
	is_dir: bool,
}

/// Lists the immediate children of `path`, respecting `.gitignore` (via the
/// same crate ripgrep uses) and always hiding the names above. One level at
/// a time, not a recursive walk — the sidebar tree loads lazily as folders
/// are expanded.
#[tauri::command]
pub fn list_directory(path: String) -> Result<Vec<DirEntry>, String> {
	let mut entries = Vec::new();

	let walker = WalkBuilder::new(&path)
		.max_depth(Some(1))
		.filter_entry(|entry| {
			entry
				.file_name()
				.to_str()
				.map(|name| !ALWAYS_HIDDEN.contains(&name))
				.unwrap_or(true)
		})
		.build();

	for result in walker {
		let entry = result.map_err(|err| err.to_string())?;
		if entry.depth() == 0 {
			continue; // the directory itself, not a child of it
		}
		let file_type = entry.file_type().ok_or_else(|| "unknown file type".to_string())?;
		entries.push(DirEntry {
			name: entry.file_name().to_string_lossy().into_owned(),
			path: entry.path().to_string_lossy().into_owned(),
			is_dir: file_type.is_dir()
		});
	}

	entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
		(true, false) => std::cmp::Ordering::Less,
		(false, true) => std::cmp::Ordering::Greater,
		_ => a.name.to_lowercase().cmp(&b.name.to_lowercase())
	});

	Ok(entries)
}

/// One watcher per expanded sidebar directory, keyed by path. Watching only
/// what's actually expanded (rather than the whole workspace recursively) is
/// the scoping call for v1 — cheaper, and matches the tree's own lazy-load
/// behavior.
pub struct WatchedDirs(Mutex<HashMap<String, notify::RecommendedWatcher>>);

impl WatchedDirs {
	pub fn new() -> Self {
		Self(Mutex::new(HashMap::new()))
	}
}

fn lock_watchers(state: &WatchedDirs) -> Result<std::sync::MutexGuard<'_, HashMap<String, notify::RecommendedWatcher>>, String> {
	state.0.lock().map_err(|_| "watcher registry lock was poisoned".to_string())
}

#[tauri::command]
pub fn watch_directory_cmd(app: AppHandle, state: tauri::State<WatchedDirs>, path: String) -> Result<(), String> {
	let mut watchers = lock_watchers(&state)?;
	if watchers.contains_key(&path) {
		return Ok(());
	}

	let emit_path = path.clone();
	let watcher = watch_directory(Path::new(&path), |_event| true, move || {
		let _ = app.emit("workspace://dir-changed", emit_path.clone());
	})?;

	watchers.insert(path, watcher);
	Ok(())
}

#[tauri::command]
pub fn unwatch_directory_cmd(state: tauri::State<WatchedDirs>, path: String) -> Result<(), String> {
	let mut watchers = lock_watchers(&state)?;
	watchers.remove(&path);
	Ok(())
}

/// Called when a different folder is opened (or the app closes a workspace)
/// so stale watchers on the old tree don't linger.
#[tauri::command]
pub fn unwatch_all_directories(state: tauri::State<WatchedDirs>) -> Result<(), String> {
	let mut watchers = lock_watchers(&state)?;
	watchers.clear();
	Ok(())
}

/// One watcher per open document that has a real path on disk (F2's
/// external-change reload) — separate from WatchedDirs above, which only
/// covers *expanded sidebar directories* and wouldn't catch a file opened
/// via file.open outside the workspace root, or sitting in a collapsed
/// directory.
pub struct WatchedFiles(Mutex<HashMap<String, notify::RecommendedWatcher>>);

impl WatchedFiles {
	pub fn new() -> Self {
		Self(Mutex::new(HashMap::new()))
	}
}

fn lock_file_watchers(state: &WatchedFiles) -> Result<std::sync::MutexGuard<'_, HashMap<String, notify::RecommendedWatcher>>, String> {
	state.0.lock().map_err(|_| "file watcher registry lock was poisoned".to_string())
}

#[tauri::command]
pub fn watch_file_cmd(app: AppHandle, state: tauri::State<WatchedFiles>, path: String) -> Result<(), String> {
	let mut watchers = lock_file_watchers(&state)?;
	if watchers.contains_key(&path) {
		return Ok(());
	}

	let file_path = Path::new(&path);
	let dir = file_path.parent().ok_or_else(|| "file path has no parent directory".to_string())?.to_path_buf();
	let file_name = file_path.file_name().map(|name| name.to_owned());
	let emit_path = path.clone();

	let watcher = watch_directory(
		&dir,
		move |event| event.paths.iter().any(|p| p.file_name() == file_name.as_deref()),
		move || {
			let _ = app.emit("workspace://file-changed", emit_path.clone());
		}
	)?;

	watchers.insert(path, watcher);
	Ok(())
}

#[tauri::command]
pub fn unwatch_file_cmd(state: tauri::State<WatchedFiles>, path: String) -> Result<(), String> {
	let mut watchers = lock_file_watchers(&state)?;
	watchers.remove(&path);
	Ok(())
}
