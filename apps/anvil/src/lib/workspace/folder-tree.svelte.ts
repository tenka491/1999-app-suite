import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { listen } from '@tauri-apps/api/event';
import {
	openFolderDialog,
	listDirectory,
	watchDirectory,
	unwatchDirectory,
	unwatchAllDirectories,
	type DirEntry
} from './file-io';

let rootPath = $state<string | null>(null);
const expandedPaths = new SvelteSet<string>();
const childrenByPath = new SvelteMap<string, DirEntry[]>();

export function getRootPath(): string | null {
	return rootPath;
}

export function isExpanded(path: string): boolean {
	return expandedPaths.has(path);
}

export function getChildren(path: string): DirEntry[] | undefined {
	return childrenByPath.get(path);
}

async function loadChildren(path: string): Promise<void> {
	childrenByPath.set(path, await listDirectory(path));
}

export async function openFolder(): Promise<void> {
	const path = await openFolderDialog();
	if (!path) return;
	await closeFolder();
	rootPath = path;
	expandedPaths.add(path);
	await loadChildren(path);
	await watchDirectory(path);
}

export async function closeFolder(): Promise<void> {
	await unwatchAllDirectories();
	expandedPaths.clear();
	childrenByPath.clear();
	rootPath = null;
}

export async function toggleExpand(path: string): Promise<void> {
	if (expandedPaths.has(path)) {
		expandedPaths.delete(path);
		await unwatchDirectory(path);
		return;
	}
	expandedPaths.add(path);
	if (!childrenByPath.has(path)) await loadChildren(path);
	await watchDirectory(path);
}

let unlistenDirChanged: (() => void) | null = null;

/** Re-lists a directory when the Rust watcher reports it changed — only if
 *  we've actually loaded it, so a change to a collapsed/unvisited directory
 *  doesn't do pointless work. */
export async function initFolderWatch(): Promise<void> {
	unlistenDirChanged?.();
	unlistenDirChanged = await listen<string>('workspace://dir-changed', (event) => {
		if (childrenByPath.has(event.payload)) loadChildren(event.payload);
	});
}

export function teardownFolderWatch(): void {
	unlistenDirChanged?.();
	unlistenDirChanged = null;
}
