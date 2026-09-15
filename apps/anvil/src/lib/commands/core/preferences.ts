import { getSettingsPath } from '../../settings/settings-store.svelte';
import { run } from '../registry.svelte';
import type { Command } from '../types';

export const preferencesOpenSettings: Command = {
	id: 'preferences.open_settings',
	title: 'Preferences: Open Settings',
	async run() {
		const path = await getSettingsPath();
		await run('workspace.open_path', { path, preview: false });
	}
};

export const preferencesCommands: Command[] = [preferencesOpenSettings];
