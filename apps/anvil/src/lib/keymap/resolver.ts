import { eventToKeystroke, isModifierEvent, keystrokeEquals, parseKeystroke } from './keys';
import type { KeyEvent, Keystroke, Platform, RawKeymapEntry, ResolvedKeymapEntry, ResolveResult } from './types';

export function resolveEntry(entry: RawKeymapEntry, platform: Platform): ResolvedKeymapEntry {
	return {
		keys: entry.keys.map((raw) => parseKeystroke(raw, platform)),
		command: entry.command,
		args: entry.args,
		platform: entry.platform
	};
}

function matchesPlatform(entry: ResolvedKeymapEntry, platform: Platform): boolean {
	return entry.platform === undefined || entry.platform === platform;
}

function sequenceSignature(keys: Keystroke[]): string {
	return keys
		.map((k) => `${k.ctrl ? 1 : 0}${k.alt ? 1 : 0}${k.shift ? 1 : 0}${k.meta ? 1 : 0}:${k.token}`)
		.join('>');
}

/** Resolves defaults and user entries for the current platform, then merges
 *  them: defaults first, user entries after. An identical key sequence in a
 *  later entry replaces the earlier one; `command: null` removes the binding
 *  entirely (PRD §4.3 merge rules). */
export function mergeKeymaps(
	defaults: RawKeymapEntry[],
	user: RawKeymapEntry[],
	platform: Platform
): ResolvedKeymapEntry[] {
	const bySignature = new Map<string, ResolvedKeymapEntry>();
	const order: string[] = [];

	for (const raw of [...defaults, ...user]) {
		const resolved = resolveEntry(raw, platform);
		if (!matchesPlatform(resolved, platform)) continue;
		const signature = sequenceSignature(resolved.keys);
		if (resolved.command === null) {
			bySignature.delete(signature);
			continue;
		}
		if (!bySignature.has(signature)) order.push(signature);
		bySignature.set(signature, resolved);
	}

	return order.filter((sig) => bySignature.has(sig)).map((sig) => bySignature.get(sig)!);
}

function sequenceStartsWith(full: Keystroke[], prefix: Keystroke[]): boolean {
	if (prefix.length > full.length) return false;
	return prefix.every((k, i) => keystrokeEquals(k, full[i]));
}

function findExact(entries: ResolvedKeymapEntry[], sequence: Keystroke[]): ResolvedKeymapEntry | undefined {
	return entries.find((e) => e.keys.length === sequence.length && sequenceStartsWith(e.keys, sequence));
}

function hasPrefixMatch(entries: ResolvedKeymapEntry[], sequence: Keystroke[]): boolean {
	return entries.some((e) => e.keys.length > sequence.length && sequenceStartsWith(e.keys, sequence));
}

/** A pure, DOM-free chord resolver. Feed it KeyEvent-shaped objects (real or
 *  fake) and it tracks pending chord state internally. */
export function createKeymapResolver(entries: ResolvedKeymapEntry[]) {
	let pending: Keystroke[] = [];

	function handleKeyEvent(event: KeyEvent): ResolveResult {
		if (isModifierEvent(event)) return { type: 'none' };

		const candidate = [...pending, eventToKeystroke(event)];
		const exact = findExact(entries, candidate);
		if (exact) {
			pending = [];
			return { type: 'match', command: exact.command, args: exact.args };
		}

		if (hasPrefixMatch(entries, candidate)) {
			pending = candidate;
			return { type: 'pending', pendingKeys: pending };
		}

		pending = [];
		return { type: 'none' };
	}

	function reset() {
		pending = [];
	}

	return {
		handleKeyEvent,
		reset,
		get pendingKeys() {
			return pending;
		}
	};
}

export type KeymapResolver = ReturnType<typeof createKeymapResolver>;
