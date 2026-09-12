import { describe, expect, it } from 'vitest';
import { parseKeymapSource } from './parse';

describe('parseKeymapSource', () => {
	it('parses a well-formed keymap', () => {
		const result = parseKeymapSource('[{ "keys": ["mod+s"], "command": "file.save" }]');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.entries).toEqual([{ keys: ['mod+s'], command: 'file.save' }]);
		}
	});

	it('tolerates comments and trailing commas (JSONC)', () => {
		const source = `[
			// a comment
			{ "keys": ["mod+shift+p"], "command": "palette.show" }, // trailing comma below
		]`;
		const result = parseKeymapSource(source);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.entries).toHaveLength(1);
		}
	});

	it('supports command: null for unbinding', () => {
		const result = parseKeymapSource('[{ "keys": ["mod+d"], "command": null }]');
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.entries[0].command).toBeNull();
		}
	});

	it('reports a line/column for malformed JSON instead of throwing', () => {
		const result = parseKeymapSource('[\n  { "keys": ["mod+s"] "command": "file.save" }\n]');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.line).toBe(2);
		}
	});

	it('rejects a non-array top level', () => {
		const result = parseKeymapSource('{ "not": "an array" }');
		expect(result.ok).toBe(false);
	});

	it('rejects an entry missing keys', () => {
		const result = parseKeymapSource('[{ "command": "file.save" }]');
		expect(result.ok).toBe(false);
	});

	it('rejects an entry with an invalid platform', () => {
		const result = parseKeymapSource('[{ "keys": ["mod+s"], "command": "file.save", "platform": "amiga" }]');
		expect(result.ok).toBe(false);
	});
});
