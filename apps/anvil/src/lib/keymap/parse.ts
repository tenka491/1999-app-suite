import { parse as parseJsonc, printParseErrorCode, type ParseError } from 'jsonc-parser';
import type { Platform, RawKeymapEntry } from './types';

export interface KeymapParseError {
	message: string;
	line: number;
	column: number;
}

export type KeymapParseResult = { ok: true; entries: RawKeymapEntry[] } | { ok: false; error: KeymapParseError };

const PLATFORMS: Platform[] = ['macos', 'linux', 'windows'];

function offsetToLineColumn(text: string, offset: number): { line: number; column: number } {
	let line = 1;
	let column = 1;
	for (let i = 0; i < offset && i < text.length; i++) {
		if (text[i] === '\n') {
			line++;
			column = 1;
		} else {
			column++;
		}
	}
	return { line, column };
}

function isValidEntry(value: unknown): value is RawKeymapEntry {
	if (typeof value !== 'object' || value === null) return false;
	const entry = value as Record<string, unknown>;
	if (!Array.isArray(entry.keys) || entry.keys.length === 0) return false;
	if (!entry.keys.every((key) => typeof key === 'string')) return false;
	if (entry.command !== null && typeof entry.command !== 'string') return false;
	if (entry.platform !== undefined && !PLATFORMS.includes(entry.platform as Platform)) return false;
	if (entry.args !== undefined && (typeof entry.args !== 'object' || entry.args === null)) return false;
	return true;
}

/** Parses a Sublime-style JSONC keymap file. On any error — malformed JSON,
 *  wrong shape — returns `ok: false` with a line/column so the caller can show
 *  a toast and keep the previously loaded keymap (PRD §4.3). */
export function parseKeymapSource(text: string): KeymapParseResult {
	const errors: ParseError[] = [];
	const value = parseJsonc(text, errors, { allowTrailingComma: true });

	if (errors.length > 0) {
		const first = errors[0];
		const { line, column } = offsetToLineColumn(text, first.offset);
		return { ok: false, error: { message: printParseErrorCode(first.error), line, column } };
	}

	if (!Array.isArray(value)) {
		return { ok: false, error: { message: 'Keymap file must be a JSON array', line: 1, column: 1 } };
	}

	const entries: RawKeymapEntry[] = [];
	for (let i = 0; i < value.length; i++) {
		if (!isValidEntry(value[i])) {
			return { ok: false, error: { message: `Entry ${i} is not a valid keymap entry`, line: 1, column: 1 } };
		}
		entries.push(value[i]);
	}

	return { ok: true, entries };
}
