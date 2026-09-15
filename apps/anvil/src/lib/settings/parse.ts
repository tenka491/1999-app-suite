import { parse as parseJsonc, printParseErrorCode, type ParseError } from 'jsonc-parser';
import { SETTINGS_KEYS, type Settings } from './types';

export interface SettingsParseError {
	message: string;
	line: number;
	column: number;
}

export type SettingsParseResult = { ok: true; settings: Partial<Settings> } | { ok: false; error: SettingsParseError };

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

const FIELD_VALIDATORS: { [K in keyof Settings]: (value: unknown) => value is Settings[K] } = {
	theme: (value): value is string => typeof value === 'string',
	fontSize: (value): value is number => typeof value === 'number',
	tabSize: (value): value is number => typeof value === 'number',
	translateTabsToSpaces: (value): value is boolean => typeof value === 'boolean',
	wordWrap: (value): value is boolean => typeof value === 'boolean',
	trimTrailingWhitespaceOnSave: (value): value is boolean => typeof value === 'boolean',
	ensureNewlineAtEofOnSave: (value): value is boolean => typeof value === 'boolean'
};

/** Parses a settings JSONC file. Unlike the keymap file (a full array that
 *  must validate entirely), a settings file may specify any subset of fields
 *  — the bundled defaults fill in the rest — so this only validates the
 *  fields that are actually present, matching the "sparse user overrides"
 *  shape settings.jsonc is meant to have. */
export function parseSettingsSource(text: string): SettingsParseResult {
	const errors: ParseError[] = [];
	const value = parseJsonc(text, errors, { allowTrailingComma: true });

	if (errors.length > 0) {
		const first = errors[0];
		const { line, column } = offsetToLineColumn(text, first.offset);
		return { ok: false, error: { message: printParseErrorCode(first.error), line, column } };
	}

	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return { ok: false, error: { message: 'Settings file must be a JSON object', line: 1, column: 1 } };
	}

	const raw = value as Record<string, unknown>;
	const settings: Partial<Settings> = {};
	for (const key of Object.keys(SETTINGS_KEYS) as (keyof Settings)[]) {
		const rawKey = SETTINGS_KEYS[key];
		if (!(rawKey in raw)) continue;
		const rawValue = raw[rawKey];
		if (!FIELD_VALIDATORS[key](rawValue)) {
			return { ok: false, error: { message: `"${rawKey}" has the wrong type`, line: 1, column: 1 } };
		}
		// The validator above proves rawValue matches Settings[K] for this key,
		// but TS can't carry that narrowing through a keyof-indexed loop.
		(settings as Record<string, unknown>)[key] = rawValue;
	}

	return { ok: true, settings };
}
