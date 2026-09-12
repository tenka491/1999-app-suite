export type Platform = 'macos' | 'linux' | 'windows';

/** One entry as it appears in a keymap JSONC file. */
export interface RawKeymapEntry {
	keys: string[];
	command: string | null;
	args?: Record<string, unknown>;
	platform?: Platform;
}

/** A single keystroke with modifiers resolved to concrete booleans (`mod` already
 *  picked apart into ctrl/meta for the current runtime platform) and a token
 *  normalized into the same space `eventToKeystroke` produces from a real event. */
export interface Keystroke {
	ctrl: boolean;
	alt: boolean;
	shift: boolean;
	meta: boolean;
	token: string;
}

/** A keymap entry with every keystroke resolved and ready to match against events. */
export interface ResolvedKeymapEntry {
	keys: Keystroke[];
	command: string | null;
	args?: Record<string, unknown>;
	platform?: Platform;
}

/** The subset of KeyboardEvent the resolver actually needs — kept as a plain
 *  interface so tests can pass plain objects instead of real DOM events. */
export interface KeyEvent {
	key: string;
	code: string;
	ctrlKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	metaKey: boolean;
}

export type ResolveResult =
	| { type: 'match'; command: string | null; args?: Record<string, unknown> }
	| { type: 'pending'; pendingKeys: Keystroke[] }
	| { type: 'none' };
