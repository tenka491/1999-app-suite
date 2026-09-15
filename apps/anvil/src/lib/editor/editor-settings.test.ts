import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import { computeEditorSettingsExtensions } from './editor-settings';
import type { Settings } from '../settings/types';

const BASE_SETTINGS: Settings = {
	theme: '1999-dark',
	fontSize: 14,
	tabSize: 4,
	translateTabsToSpaces: true,
	wordWrap: false,
	trimTrailingWhitespaceOnSave: false,
	ensureNewlineAtEofOnSave: true
};

function stateFor(settings: Settings): EditorState {
	return EditorState.create({ extensions: computeEditorSettingsExtensions(settings) });
}

describe('computeEditorSettingsExtensions', () => {
	it('sets tabSize from settings', () => {
		const state = stateFor({ ...BASE_SETTINGS, tabSize: 3 });
		expect(state.tabSize).toBe(3);
	});

	it('uses spaces for indentUnit when translateTabsToSpaces is on', () => {
		const state = stateFor({ ...BASE_SETTINGS, tabSize: 2, translateTabsToSpaces: true });
		expect(state.facet(indentUnit)).toBe('  ');
	});

	it('uses a literal tab for indentUnit when translateTabsToSpaces is off', () => {
		const state = stateFor({ ...BASE_SETTINGS, translateTabsToSpaces: false });
		expect(state.facet(indentUnit)).toBe('\t');
	});

	it('omits line wrapping when wordWrap is off', () => {
		const state = stateFor({ ...BASE_SETTINGS, wordWrap: false });
		expect(state.facet(EditorView.contentAttributes)).not.toContainEqual({ class: 'cm-lineWrapping' });
	});

	it('includes line wrapping when wordWrap is on', () => {
		const state = stateFor({ ...BASE_SETTINGS, wordWrap: true });
		expect(state.facet(EditorView.contentAttributes)).toContainEqual({ class: 'cm-lineWrapping' });
	});
});
