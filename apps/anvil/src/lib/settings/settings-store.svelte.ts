import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { modify, applyEdits } from 'jsonc-parser';
import defaultSettingsSource from './default-settings.jsonc?raw';
import { parseSettingsSource } from './parse';
import { SETTINGS_KEYS, type Settings } from './types';
import { showToast } from '../ui/toast.svelte';

// Used only if the bundled default-settings.jsonc itself fails to parse —
// a build-time bug, not something a user should ever see (same reasoning as
// keymap-store's loadDefaults). Keeps the app usable rather than crashing.
const FALLBACK_SETTINGS: Settings = {
	theme: '1999-dark',
	fontSize: 14,
	tabSize: 2,
	translateTabsToSpaces: true,
	wordWrap: false,
	trimTrailingWhitespaceOnSave: false,
	ensureNewlineAtEofOnSave: true
};

let defaultSettings: Settings = FALLBACK_SETTINGS;
let userOverrides: Partial<Settings> = {};
let currentSettings = $state<Settings>(FALLBACK_SETTINGS);

export function getSettings(): Settings {
	return currentSettings;
}

function rebuild(): void {
	// Build from the local values, not by reading currentSettings back after
	// assigning it — same "effect reads and writes the same state" trap noted
	// in keymap-store's rebuild().
	currentSettings = { ...defaultSettings, ...userOverrides };
}

function loadDefaults(): void {
	const result = parseSettingsSource(defaultSettingsSource);
	if (!result.ok) {
		console.error('Bundled default settings failed to parse:', result.error);
		return;
	}
	const missing = (Object.keys(SETTINGS_KEYS) as (keyof Settings)[]).filter((key) => !(key in result.settings));
	if (missing.length > 0) {
		console.error(`Bundled default settings is missing: ${missing.join(', ')}`);
		return;
	}
	defaultSettings = result.settings as Settings;
}

async function loadUserSettings(): Promise<void> {
	try {
		const source = await invoke<string>('read_user_settings');
		const result = parseSettingsSource(source);
		if (!result.ok) {
			showToast(`Settings error at ${result.error.line}:${result.error.column} — ${result.error.message}`, 'error');
			return; // keep whatever userOverrides already held
		}
		userOverrides = result.settings;
		rebuild();
	} catch (err) {
		showToast(`Couldn't load your settings file: ${err}`, 'error');
	}
}

let unlistenFns: Array<() => void> = [];

/** Loads the default + user settings and merges them, and starts watching
 *  the user settings file for hot reload. Safe to call more than once —
 *  previous listeners are torn down first (see keymap-store's initKeymap). */
export async function initSettings(): Promise<void> {
	loadDefaults();
	rebuild();
	await loadUserSettings();

	teardownSettings();
	unlistenFns = [
		await listen('settings://changed', () => {
			loadUserSettings();
		}),
		await listen<string>('settings://watch-failed', (event) => {
			showToast(`Settings changes won't hot-reload: ${event.payload}`, 'error');
		})
	];
}

export function teardownSettings(): void {
	for (const unlisten of unlistenFns) unlisten();
	unlistenFns = [];
}

export async function getSettingsPath(): Promise<string> {
	return invoke<string>('get_settings_path');
}

/** Writes one field into the user's settings.jsonc via a targeted edit
 *  (jsonc-parser's modify/applyEdits) rather than re-serializing the whole
 *  file, so any comments or formatting the user added survive. Doesn't
 *  update `currentSettings` itself — the file watcher's `settings://changed`
 *  round-trip does that, same as any other external edit to the file. */
export async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
	const source = await invoke<string>('read_user_settings');
	const edits = modify(source, [SETTINGS_KEYS[key]], value, { formattingOptions: { tabSize: 2, insertSpaces: true } });
	const updated = applyEdits(source, edits);

	// write_user_settings persists whatever it's given with no validation of
	// its own — confirm the edit actually produced valid JSONC before writing,
	// so a malformed hand-edited settings file (modify()'s behavior on
	// already-broken input isn't guaranteed) can't get further corrupted with
	// no way back. loadUserSettings() already reports the existing error via
	// a toast on the next hot-reload; this just refuses to make it worse.
	if (!parseSettingsSource(updated).ok) {
		showToast(`Couldn't update "${SETTINGS_KEYS[key]}" — your settings file has a syntax error. Fix it manually first.`, 'error');
		return;
	}

	await invoke('write_user_settings', { contents: updated });
}
