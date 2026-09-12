import type { KeyEvent, Keystroke, Platform } from './types';

// Punctuation and shifted symbols are matched on event.code so shift state and
// keyboard layout don't break bindings (PRD §4.3). Keyed by the code CodeMirror/
// the DOM reports; the value is the canonical token used on both the config and
// event side.
//
// Tab is included for a different reason: WebKitGTK reports event.key as the
// literal string "Unidentified" for Shift-Tab specifically (likely an X11
// ISO_Left_Tab keysym quirk) while event.code stays "Tab" either way — so Tab
// has to be resolved by code too, or Shift-Tab silently fails to match anything.
const CODE_TO_TOKEN: Record<string, string> = {
	Slash: '/',
	Backslash: '\\',
	BracketLeft: '[',
	BracketRight: ']',
	Semicolon: ';',
	Quote: "'",
	Comma: ',',
	Period: '.',
	Minus: '-',
	Equal: '=',
	Backquote: '`',
	Tab: 'tab'
};

const TOKEN_TO_CODE: Record<string, string> = Object.fromEntries(
	Object.entries(CODE_TO_TOKEN).map(([code, token]) => [token, code])
);

// Named keys: aliases used in keymap files, normalized to the same lowercase
// form eventToKeystroke() derives from event.key.
const NAMED_KEY_ALIASES: Record<string, string> = {
	esc: 'escape',
	return: 'enter',
	up: 'arrowup',
	down: 'arrowdown',
	left: 'arrowleft',
	right: 'arrowright',
	space: ' ',
	spacebar: ' ',
	plus: '+' // escape hatch for "mod+plus", since "+" itself is the separator
};

/** Normalizes a single keystroke token (the part after modifiers are stripped)
 *  from a keymap config string into the same space eventToKeystroke() produces. */
export function normalizeToken(rawToken: string): string {
	const lower = rawToken.toLowerCase();
	if (lower in TOKEN_TO_CODE) return lower; // already a canonical punctuation token
	return NAMED_KEY_ALIASES[lower] ?? lower;
}

const MODIFIER_ALIASES: Record<string, 'mod' | 'ctrl' | 'alt' | 'shift' | 'super'> = {
	mod: 'mod',
	ctrl: 'ctrl',
	control: 'ctrl',
	alt: 'alt',
	option: 'alt',
	shift: 'shift',
	super: 'super',
	cmd: 'super',
	command: 'super',
	meta: 'super'
};

/** Parses "mod+shift+p" into a Keystroke, resolving `mod` to ctrl (linux/windows)
 *  or meta (macos) for the given runtime platform. Modifier order and case don't
 *  matter (PRD §4.3). */
export function parseKeystroke(raw: string, platform: Platform): Keystroke {
	const parts = raw
		.split('+')
		.map((part) => part.trim())
		.filter(Boolean);

	let ctrl = false;
	let alt = false;
	let shift = false;
	let meta = false;
	let token: string | null = null;

	for (const part of parts) {
		const alias = MODIFIER_ALIASES[part.toLowerCase()];
		if (alias === 'mod') {
			if (platform === 'macos') meta = true;
			else ctrl = true;
		} else if (alias === 'ctrl') ctrl = true;
		else if (alias === 'alt') alt = true;
		else if (alias === 'shift') shift = true;
		else if (alias === 'super') meta = true;
		else token = normalizeToken(part);
	}

	if (token === null) {
		throw new Error(`Keystroke "${raw}" has no non-modifier key`);
	}

	return { ctrl, alt, shift, meta, token };
}

/** Converts a real (or fake, for tests) key event into the same Keystroke shape
 *  parseKeystroke() produces, so the two can be compared directly. */
export function eventToKeystroke(event: KeyEvent): Keystroke {
	const token = CODE_TO_TOKEN[event.code] ?? event.key.toLowerCase();
	return {
		ctrl: event.ctrlKey,
		alt: event.altKey,
		shift: event.shiftKey,
		meta: event.metaKey,
		token
	};
}

/** True for events that are just a modifier key on its own (Shift, Control, …) —
 *  these should never start or continue a chord. */
export function isModifierEvent(event: KeyEvent): boolean {
	return ['Control', 'Alt', 'Shift', 'Meta'].includes(event.key);
}

export function keystrokeEquals(a: Keystroke, b: Keystroke): boolean {
	return a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift && a.meta === b.meta && a.token === b.token;
}

/** Human-readable form for the status bar's pending-chord display, e.g. "mod+k". */
export function formatKeystroke(keystroke: Keystroke, platform: Platform): string {
	const parts: string[] = [];
	const modIsMeta = platform === 'macos';
	if (modIsMeta ? keystroke.meta : keystroke.ctrl) parts.push('mod');
	if (modIsMeta ? keystroke.ctrl : keystroke.meta) parts.push(modIsMeta ? 'ctrl' : 'super');
	if (keystroke.alt) parts.push('alt');
	if (keystroke.shift) parts.push('shift');
	parts.push(keystroke.token);
	return parts.join('+');
}
