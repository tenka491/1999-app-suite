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

/// The ignore-aware walk itself, split out of the `#[tauri::command]` below
/// so it's callable from a unit test without needing a `tauri::State` to
/// construct (PRD §8: "cargo test for the ignore-aware walk...").
fn walk_workspace(root: &str) -> Result<Vec<IndexEntry>, String> {
	let mut files = Vec::new();
	let root_path = Path::new(root);
	let walker = WalkBuilder::new(root)
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

	Ok(files)
}

/// Walks `root` and caches every file path (not directories) for `search_files`
/// to match against. Call this once per folder-open; a stale index just means
/// newly created files won't show up in Goto Anything until the next open —
/// acceptable for v1 (full watch-driven invalidation is real work for a
/// ~20k-entry index and isn't needed yet).
#[tauri::command]
pub fn index_workspace(state: tauri::State<FileIndex>, root: String) -> Result<usize, String> {
	let files = walk_workspace(&root)?;
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

/// The fuzzy ranking itself, split out for the same testability reason as
/// `walk_workspace` above (PRD §8: "...and fuzzy ranking").
fn fuzzy_match(files: &[IndexEntry], query: &str) -> Vec<SearchResult> {
	let haystacks: Vec<Candidate> = files
		.iter()
		.enumerate()
		.map(|(index, entry)| Candidate { index, relative_path: &entry.relative_path })
		.collect();

	let mut matcher = Matcher::new(Config::DEFAULT);
	let pattern = Pattern::parse(query, CaseMatching::Smart, Normalization::Smart);
	let mut matches = pattern.match_list(haystacks, &mut matcher);
	matches.truncate(50);

	matches
		.into_iter()
		.map(|(candidate, _score)| {
			let entry = &files[candidate.index];
			SearchResult {
				name: Path::new(&entry.relative_path).file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
				path: entry.path.to_string_lossy().into_owned(),
				relative_path: entry.relative_path.clone()
			}
		})
		.collect()
}

#[tauri::command]
pub fn search_files(state: tauri::State<FileIndex>, query: String) -> Result<Vec<SearchResult>, String> {
	let files = state.0.lock().map_err(|_| "file index lock poisoned".to_string())?;
	Ok(fuzzy_match(&files, &query))
}

#[cfg(test)]
mod tests {
	use super::*;
	use std::fs;

	/// std::env::temp_dir() + a unique-per-test name, rather than pulling in
	/// a tempfile dependency for something this small — removed on drop so a
	/// failed assertion still cleans up.
	struct TempDir(PathBuf);

	impl TempDir {
		fn new(name: &str) -> Self {
			let dir = std::env::temp_dir().join(format!("anvil-search-test-{name}-{}", std::process::id()));
			let _ = fs::remove_dir_all(&dir);
			fs::create_dir_all(&dir).unwrap();
			Self(dir)
		}

		fn path(&self) -> &str {
			self.0.to_str().unwrap()
		}

		fn write(&self, relative: &str, contents: &str) {
			let path = self.0.join(relative);
			if let Some(parent) = path.parent() {
				fs::create_dir_all(parent).unwrap();
			}
			fs::write(path, contents).unwrap();
		}
	}

	impl Drop for TempDir {
		fn drop(&mut self) {
			let _ = fs::remove_dir_all(&self.0);
		}
	}

	fn relative_paths(files: &[IndexEntry]) -> Vec<String> {
		let mut paths: Vec<String> = files.iter().map(|f| f.relative_path.clone()).collect();
		paths.sort();
		paths
	}

	#[test]
	fn walk_workspace_finds_files_in_subdirectories() {
		let dir = TempDir::new("basic");
		dir.write("a.txt", "a");
		dir.write("sub/b.txt", "b");

		let files = walk_workspace(dir.path()).unwrap();

		assert_eq!(relative_paths(&files), vec!["a.txt", "sub/b.txt"]);
	}

	#[test]
	fn walk_workspace_skips_always_hidden_directories() {
		let dir = TempDir::new("hidden");
		dir.write("kept.txt", "kept");
		dir.write(".git/HEAD", "ref: refs/heads/master");
		dir.write("node_modules/pkg/index.js", "module.exports = {};");

		let files = walk_workspace(dir.path()).unwrap();

		assert_eq!(relative_paths(&files), vec!["kept.txt"]);
	}

	#[test]
	fn walk_workspace_respects_gitignore() {
		let dir = TempDir::new("gitignore");
		// ignore::WalkBuilder only honors .gitignore inside an actual git
		// repo by default (require_git defaults to true) — a bare marker
		// file is enough for it to recognize one, without needing a real
		// `git init`.
		dir.write(".git/HEAD", "ref: refs/heads/master");
		dir.write(".gitignore", "ignored.txt\n");
		dir.write("kept.txt", "kept");
		dir.write("ignored.txt", "ignored");

		let files = walk_workspace(dir.path()).unwrap();

		// .gitignore itself doesn't show up either — WalkBuilder's default
		// hidden(true) filters dotfiles regardless of gitignore rules; that's
		// the same default list_directory (workspace.rs) relies on for the
		// sidebar, not something specific to this test.
		assert_eq!(relative_paths(&files), vec!["kept.txt"]);
	}

	fn entry(relative_path: &str) -> IndexEntry {
		IndexEntry { path: PathBuf::from("/checkout-root").join(relative_path), relative_path: relative_path.to_string() }
	}

	#[test]
	fn fuzzy_match_ranks_an_exact_name_above_a_buried_substring_match() {
		let files = vec![entry("src/lib/very/deeply/nested/reindex-thing.ts"), entry("index.ts")];

		let results = fuzzy_match(&files, "index");

		assert_eq!(results[0].relative_path, "index.ts");
	}

	#[test]
	fn fuzzy_match_matches_against_relative_path_not_absolute_path() {
		// Every entry's absolute path is rooted under "/checkout-root" (see
		// `entry` above) but no relative_path contains that substring —
		// matching against the wrong field would find "root" here, which is
		// exactly the machine-specific-path bug the relative-path switch fixed.
		let files = vec![entry("src/lib/settings/parse.ts")];

		let results = fuzzy_match(&files, "root");

		assert!(results.is_empty());
	}

	#[test]
	fn fuzzy_match_excludes_non_matching_entries() {
		let files = vec![entry("apple.ts"), entry("banana.ts")];

		let results = fuzzy_match(&files, "banana");

		assert_eq!(results.len(), 1);
		assert_eq!(results[0].name, "banana.ts");
	}

	#[test]
	fn fuzzy_match_truncates_to_50_results() {
		let files: Vec<IndexEntry> = (0..75).map(|i| entry(&format!("file{i}.ts"))).collect();

		let results = fuzzy_match(&files, "file");

		assert_eq!(results.len(), 50);
	}
}
