import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import defaultKeymapSource from './default-keymap.jsonc?raw';
import { parseKeymapSource } from './parse';
import { mergeKeymaps, createKeymapResolver, type KeymapResolver } from './resolver';
import { formatKeystroke } from './keys';
import { detectPlatform } from './platform';
import { run } from '../commands/registry.svelte';
import { showToast } from '../ui/toast.svelte';
import { isAnyModalOpen } from '../ui/modal-state.svelte';
import { getActiveView } from '../workspace/active-view.svelte';
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
	// While any overlay is open, it owns its own keyboard handling — don't
	// also run keybindings underneath it.
	if (isAnyModalOpen()) return;
	// Tab/Shift-Tab double as focus-navigation everywhere outside the editor
	// (moving between toolbar buttons, sidebar entries, etc.) — the keymap
	// only claims them for indent/outdent while the editor itself has focus,
	// since this resolver is global rather than scoped to the editor.
	// event.code, not event.key — WebKitGTK reports event.key as "Unidentified"
	// for Shift-Tab specifically (see keys.ts), so checking key would silently
	// only scope plain Tab and let Shift-Tab bypass this guard entirely.
	if (event.code === 'Tab' && !getActiveView()?.hasFocus) return;
	// OS key-repeat re-fires keydown for a held key. Feeding that into the
	// resolver is never right: mid-chord it folds into the pending sequence
	// as a bogus repeated key (e.g. holding mod+k a beat too long turns the
	// pending [k] into [k, k], which matches nothing and silently resets —
	// the chord has to be redone with no feedback as to why); for a
	// single-key binding it would re-run the command for as long as the key
	// stays down.
	if (event.repeat) return;
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
