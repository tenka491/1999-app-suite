import { getSettingsPath } from '../../settings/settings-store.svelte';
import { getKeymapPath, getDefaultKeymapSource } from '../../keymap/keymap-store.svelte';
import { openDocument } from '../../workspace/workspace-state.svelte';
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

export const preferencesOpenKeymap: Command = {
	id: 'preferences.open_keymap',
	title: 'Preferences: Open Keymap',
	async run() {
		const path = await getKeymapPath();
		await run('workspace.open_path', { path, preview: false });
	}
};

/** Opens the bundled defaults as an untitled reference buffer, not a real
 *  file — the source `default-keymap.jsonc` only exists as a raw string
 *  inlined into the JS bundle at build time (see keymap-store.svelte.ts),
 *  not as a standalone file a packaged app could read from disk. Sublime's
 *  own "Keymap - Default" is genuinely read-only; this app has no read-only
 *  buffer support built, and building it for one reference view isn't
 *  justified — editing this copy just doesn't do anything (it's untitled,
 *  not the actual defaults), and Save As lets you keep a copy if you want
 *  one. Opens as plain text (no path means no extension to detect JSONC
 *  syntax highlighting from) rather than adding a language-override
 *  parameter to openDocument for this one case. */
export const preferencesOpenDefaultKeymap: Command = {
	id: 'preferences.open_default_keymap',
	title: 'Preferences: Open Default Keymap',
	run() {
		openDocument(null, getDefaultKeymapSource(), 'lf', { preview: false });
	}
};

export const preferencesCommands: Command[] = [
	preferencesOpenSettings,
	preferencesOpenKeymap,
	preferencesOpenDefaultKeymap
];
