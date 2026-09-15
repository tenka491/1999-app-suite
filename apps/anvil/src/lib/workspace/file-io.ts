import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { askConfirm } from '../ui/confirm.svelte';
import type { LineEnding } from './types';

// F3: "files up to ~10 MB must open without freezing. Above that, show a
// warning before opening."
const LARGE_FILE_WARNING_BYTES = 10 * 1024 * 1024;

export async function openFileDialog(): Promise<{ path: string } | null> {
	const path = await open({ multiple: false, directory: false });
	if (!path || Array.isArray(path)) return null;
	return { path };
}

export async function readFile(path: string): Promise<{ contents: string; lineEnding: LineEnding }> {
	const result = await invoke<{ contents: string; line_ending: LineEnding }>('read_file', { path });
	return { contents: result.contents, lineEnding: result.line_ending };
}

export async function getFileSize(path: string): Promise<number> {
	return invoke<number>('get_file_size', { path });
}

/** The shared "open a file" entry point for file.open and workspace.open_path
 *  alike — checks size first and warns above the F3 threshold, so a huge
 *  file doesn't get read into memory just to find out it's huge. Returns
 *  null if the user backs out of that warning (a plain "don't open it"
 *  cancel, not an error — binary/non-UTF-8 files still throw normally from
 *  readFile and are left to the caller's usual error handling). */
export async function readFileWithChecks(path: string): Promise<{ contents: string; lineEnding: LineEnding } | null> {
	const size = await getFileSize(path);
	if (size > LARGE_FILE_WARNING_BYTES) {
		const mb = (size / (1024 * 1024)).toFixed(1);
		const proceed = await askConfirm(`This file is ${mb} MB. Opening it may be slow. Open anyway?`, 'Open Anyway');
		if (!proceed) return null;
	}
	return readFile(path);
}

export async function writeFile(path: string, contents: string, lineEnding: LineEnding): Promise<void> {
	// Tauri auto-converts Rust command *argument* names from snake_case to
	// camelCase for JS callers (unlike plain Serialize return values, which
	// keep whatever casing the struct declares) — this key must be camelCase.
	await invoke('write_file', { path, contents, lineEnding });
}

export async function saveAsDialog(): Promise<string | null> {
	return (await save()) ?? null;
}

export async function openFolderDialog(): Promise<string | null> {
	const path = await open({ multiple: false, directory: true });
	if (!path || Array.isArray(path)) return null;
	return path;
}

export interface DirEntry {
	name: string;
	path: string;
	isDir: boolean;
}

export async function listDirectory(path: string): Promise<DirEntry[]> {
	const entries = await invoke<{ name: string; path: string; is_dir: boolean }[]>('list_directory', { path });
	return entries.map((e) => ({ name: e.name, path: e.path, isDir: e.is_dir }));
}

export async function watchDirectory(path: string): Promise<void> {
	await invoke('watch_directory_cmd', { path });
}

export async function unwatchDirectory(path: string): Promise<void> {
	await invoke('unwatch_directory_cmd', { path });
}

export async function unwatchAllDirectories(): Promise<void> {
	await invoke('unwatch_all_directories');
}

// F2's external-change reload: one watcher per open document with a real
// path, independent of WatchedDirs above (which only covers expanded
// sidebar directories).
export async function watchFile(path: string): Promise<void> {
	await invoke('watch_file_cmd', { path });
}

export async function unwatchFile(path: string): Promise<void> {
	await invoke('unwatch_file_cmd', { path });
}

export async function indexWorkspace(root: string): Promise<number> {
	return invoke<number>('index_workspace', { root });
}

export interface SearchResult {
	name: string;
	path: string;
	relativePath: string;
}

export async function searchFiles(query: string): Promise<SearchResult[]> {
	const results = await invoke<{ name: string; path: string; relative_path: string }[]>('search_files', {
		query
	});
	return results.map((r) => ({ name: r.name, path: r.path, relativePath: r.relative_path }));
}
