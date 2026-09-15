import { describe, expect, it } from 'vitest';
import { parseSettingsSource } from './parse';

describe('parseSettingsSource', () => {
	it('parses a well-formed settings object', () => {
		const result = parseSettingsSource('{ "theme": "1999-dark", "font_size": 16 }');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.settings).toEqual({ theme: '1999-dark', fontSize: 16 });
		}
	});

	it('accepts an empty object — a sparse user override file with nothing set', () => {
		const result = parseSettingsSource('{}');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.settings).toEqual({});
		}
	});

	it('tolerates comments and trailing commas (JSONC)', () => {
		const source = `{
			// a comment
			"word_wrap": true, // trailing comma below
		}`;
		const result = parseSettingsSource(source);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.settings).toEqual({ wordWrap: true });
		}
	});

	it('ignores unknown keys rather than rejecting the file', () => {
		const result = parseSettingsSource('{ "theme": "1999-dark", "not_a_real_setting": 1 }');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.settings).toEqual({ theme: '1999-dark' });
		}
	});

	it('reports a line/column for malformed JSON instead of throwing', () => {
		const result = parseSettingsSource('{\n  "theme": "1999-dark" "font_size": 16\n}');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.line).toBe(2);
		}
	});

	it('rejects a non-object top level', () => {
		const result = parseSettingsSource('["not", "an", "object"]');
		expect(result.ok).toBe(false);
	});

	it('rejects a field with the wrong type', () => {
		const result = parseSettingsSource('{ "font_size": "sixteen" }');
		expect(result.ok).toBe(false);
	});
});
