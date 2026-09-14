import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { LineEnding } from './types';

export async function openFileDialog(): Promise<{ path: string } | null> {
	const path = await open({ multiple: false, directory: false });
	if (!path || Array.isArray(path)) return null;
	return { path };
}

export async function readFile(path: string): Promise<{ contents: string; lineEnding: LineEnding }> {
	const result = await invoke<{ contents: string; line_ending: LineEnding }>('read_file', { path });
	return { contents: result.contents, lineEnding: result.line_ending };
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
