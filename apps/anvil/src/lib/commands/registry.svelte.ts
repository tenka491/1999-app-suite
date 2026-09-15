import { SvelteSet } from 'svelte/reactivity';
import { getActiveView } from '../workspace/active-view.svelte';
import { getActiveDocument, getActivePane } from '../workspace/workspace-state.svelte';
import { showToast } from '../ui/toast-store.svelte';
import type { Command, CommandContext } from './types';

interface RegistryEntry {
	command: Command;
	source: string;
}

const commands = new Map<string, RegistryEntry>();
// Plain $state(new Set()) doesn't make .add()/.delete() reactive — same gap
// as Map (see the SvelteMap note in workspace-state.svelte.ts). isRunning()
// backs the toolbar buttons' `disabled` state, so this needs SvelteSet.
const runningIds = new SvelteSet<string>();
const recentIds = $state<string[]>([]);
const MAX_RECENT = 10;

/** Mutable at runtime, not a frozen object assembled at import time — the
 *  thing that makes a plugin system additive later (PRD §4.2, §11). */
export function register(command: Command, source: string): void {
	commands.set(command.id, { command, source });
}

export function unregisterBySource(source: string): void {
	for (const [id, entry] of commands) {
		if (entry.source === source) commands.delete(id);
	}
}

export function getCommand(id: string): Command | undefined {
	return commands.get(id)?.command;
}

export function listCommands(): Command[] {
	return Array.from(commands.values(), (entry) => entry.command);
}

export function isRunning(id: string): boolean {
	return runningIds.has(id);
}

export function getRecentCommandIds(): string[] {
	return recentIds;
}

function recordUsage(id: string): void {
	const existingIndex = recentIds.indexOf(id);
	if (existingIndex !== -1) recentIds.splice(existingIndex, 1);
	recentIds.unshift(id);
	recentIds.length = Math.min(recentIds.length, MAX_RECENT);
}

function buildContext(): CommandContext {
	return { view: getActiveView(), doc: getActiveDocument(), pane: getActivePane() };
}

/** The only way UI should trigger an action — `run("file.save")`, never a
 *  direct import of a save() function (PRD §4.2, §11). Centralizes the two
 *  things every call site would otherwise duplicate: guarding against a
 *  command re-entering while it's already running, and turning a thrown
 *  error into a toast instead of an unhandled rejection. */
export async function run(id: string, args?: Record<string, unknown>): Promise<void> {
	if (runningIds.has(id)) return;
	const command = getCommand(id);
	if (!command) {
		console.warn(`No command registered with id "${id}"`);
		return;
	}
	runningIds.add(id);
	recordUsage(id);
	try {
		await command.run(buildContext(), args);
	} catch (err) {
		showToast(`${command.title} failed: ${err}`, 'error');
	} finally {
		runningIds.delete(id);
	}
}
