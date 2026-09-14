use ignore::WalkBuilder;
use nucleo_matcher::pattern::{CaseMatching, Normalization, Pattern};
use nucleo_matcher::{Config, Matcher};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

const ALWAYS_HIDDEN: &[&str] = &[".git", "node_modules", "target", "_build", "deps"];

struct IndexEntry {
	path: PathBuf,
	/// Precomputed once here (root is known at index time) so `search_files`
	/// matches against it directly instead of the absolute path, which would
	/// otherwise pollute every query with substrings from the checkout's
	/// machine-specific parent directories.
	relative_path: String
}

/// The current workspace's file list, built once (not per keystroke — a full
/// walk on every keystroke is exactly the lag PRD §F8 rules out on a ~20k
/// file repo) and re-matched against per search.
pub struct FileIndex(Mutex<Vec<IndexEntry>>);

impl FileIndex {
	pub fn new() -> Self {
		Self(Mutex::new(Vec::new()))
	}
}

#[derive(Serialize)]
pub struct SearchResult {
	name: String,
	path: String,
	relative_path: String
}

/// Walks `root` and caches every file path (not directories) for `search_files`
/// to match against. Call this once per folder-open; a stale index just means
/// newly created files won't show up in Goto Anything until the next open —
/// acceptable for v1 (full watch-driven invalidation is real work for a
/// ~20k-entry index and isn't needed yet).
#[tauri::command]
pub fn index_workspace(state: tauri::State<FileIndex>, root: String) -> Result<usize, String> {
	let mut files = Vec::new();
	let root_path = Path::new(&root);
	let walker = WalkBuilder::new(&root)
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
		if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
			let path = entry.into_path();
			let relative_path = path.strip_prefix(root_path).unwrap_or(&path).to_string_lossy().into_owned();
			files.push(IndexEntry { path, relative_path });
		}
	}

	let count = files.len();
	*state.0.lock().map_err(|_| "file index lock poisoned".to_string())? = files;
	Ok(count)
}

/// Wraps a borrowed relative path with the index of its `IndexEntry` so a
/// match result can be traced back to its absolute path — without cloning
/// every path string on every keystroke just to hand nucleo something owned.
struct Candidate<'a> {
	index: usize,
	relative_path: &'a str
}

impl<'a> AsRef<str> for Candidate<'a> {
	fn as_ref(&self) -> &str {
		self.relative_path
	}
}

#[tauri::command]
pub fn search_files(state: tauri::State<FileIndex>, query: String) -> Result<Vec<SearchResult>, String> {
	let files = state.0.lock().map_err(|_| "file index lock poisoned".to_string())?;

	let haystacks: Vec<Candidate> = files
		.iter()
		.enumerate()
		.map(|(index, entry)| Candidate { index, relative_path: &entry.relative_path })
		.collect();

	let mut matcher = Matcher::new(Config::DEFAULT);
	let pattern = Pattern::parse(&query, CaseMatching::Smart, Normalization::Smart);
	let mut matches = pattern.match_list(haystacks, &mut matcher);
	matches.truncate(50);

	Ok(matches
		.into_iter()
		.map(|(candidate, _score)| {
			let entry = &files[candidate.index];
			SearchResult {
				name: Path::new(&entry.relative_path).file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
				path: entry.path.to_string_lossy().into_owned(),
				relative_path: entry.relative_path.clone()
			}
		})
		.collect())
}
