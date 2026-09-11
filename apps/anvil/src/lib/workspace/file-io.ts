import { open, save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export async function openFileDialog(): Promise<{ path: string; contents: string } | null> {
	const path = await open({ multiple: false, directory: false });
	if (!path || Array.isArray(path)) return null;
	const contents = await invoke<string>('read_file', { path });
	return { path, contents };
}

export async function writeFile(path: string, contents: string): Promise<void> {
	await invoke('write_file', { path, contents });
}

export async function saveFileAsDialog(contents: string): Promise<string | null> {
	const path = await save();
	if (!path) return null;
	await writeFile(path, contents);
	return path;
}
