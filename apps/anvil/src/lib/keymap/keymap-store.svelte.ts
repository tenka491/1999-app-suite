import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import defaultKeymapSource from './default-keymap.jsonc?raw';
import { parseKeymapSource } from './parse';
import { mergeKeymaps, createKeymapResolver, type KeymapResolver } from './resolver';
import { formatKeystroke } from './keys';
import { detectPlatform } from './platform';
import { run } from '../commands/registry.svelte';
import { showToast } from '../ui/toast.svelte';
import { isPaletteOpen } from '../ui/palette-state.svelte';
import type { RawKeymapEntry, ResolvedKeymapEntry } from './types';

const platform = detectPlatform();

let defaultEntries: RawKeymapEntry[] = [];
let userEntries: RawKeymapEntry[] = [];
let resolvedEntries = $state<ResolvedKeymapEntry[]>([]);
let resolver: KeymapResolver = createKeymapResolver([]);
let pendingChordLabel = $state<string | null>(null);

export function getPendingChordLabel(): string | null {
	return pendingChordLabel;
}

function rebuild(): void {
	// Build from the local value, not by reading resolvedEntries back after
	// assigning it — reading a $state you just wrote in the same pass is what
	// trips Svelte's "effect reads and writes the same state" loop guard.
	const merged = mergeKeymaps(defaultEntries, userEntries, platform);
	resolvedEntries = merged;
	resolver = createKeymapResolver(merged);
}

function loadDefaults(): void {
	const result = parseKeymapSource(defaultKeymapSource);
	if (!result.ok) {
		// A broken bundled default keymap is a build-time bug, not something a toast helps with.
		console.error('Bundled default keymap failed to parse:', result.error);
		return;
	}
	defaultEntries = result.entries;
}

async function loadUserKeymap(): Promise<void> {
	try {
		const source = await invoke<string>('read_user_keymap');
		const result = parseKeymapSource(source);
		if (!result.ok) {
			showToast(`Keymap error at ${result.error.line}:${result.error.column} — ${result.error.message}`, 'error');
			return; // keep whatever userEntries already held
		}
		userEntries = result.entries;
		rebuild();
	} catch (err) {
		showToast(`Couldn't load your keymap file: ${err}`, 'error');
	}
}

let unlistenFns: Array<() => void> = [];

/** Loads the default + user keymaps, merges them, and starts watching the
 *  user keymap file for hot reload (PRD §4.3). Safe to call more than once
 *  (e.g. across a dev-mode page reload) — previous listeners are torn down
 *  first so they don't stack up and each fire independently. */
export async function initKeymap(): Promise<void> {
	loadDefaults();
	rebuild();
	await loadUserKeymap();

	teardownKeymap();
	unlistenFns = [
		await listen('keymap://changed', () => {
			loadUserKeymap();
		}),
		await listen<string>('keymap://watch-failed', (event) => {
			showToast(`Keymap changes won't hot-reload: ${event.payload}`, 'error');
		})
	];
}

export function teardownKeymap(): void {
	for (const unlisten of unlistenFns) unlisten();
	unlistenFns = [];
}

export function getKeybindingLabel(commandId: string): string | null {
	const matches = resolvedEntries.filter((e) => e.command === commandId);
	if (matches.length === 0) return null;
	return matches.map((entry) => entry.keys.map((k) => formatKeystroke(k, platform)).join(' ')).join(', ');
}

export function handleGlobalKeydown(event: KeyboardEvent): void {
	// While the palette (or, later, any other modal) is open, it owns its own
	// keyboard handling — don't also run keybindings underneath it.
	if (isPaletteOpen()) return;
	const result = resolver.handleKeyEvent(event);
	if (result.type === 'match') {
		event.preventDefault();
		pendingChordLabel = null;
		if (result.command) run(result.command, result.args);
	} else if (result.type === 'pending') {
		event.preventDefault();
		pendingChordLabel = result.pendingKeys.map((k) => formatKeystroke(k, platform)).join(' ');
	} else {
		pendingChordLabel = null;
	}
}
