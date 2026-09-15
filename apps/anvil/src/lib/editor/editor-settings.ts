import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import type { Settings } from '../settings/types';

/** Holds tab size, soft tabs, and word wrap — the settings.jsonc fields that
 *  map onto real CodeMirror behavior rather than pure CSS (contrast font
 *  size, which is session-only and lives entirely in a CSS custom property —
 *  see font-size-state.svelte.ts). One compartment for all three since they
 *  always get reconfigured together, on the same settings change. */
export const editorSettingsCompartment = new Compartment();

export function computeEditorSettingsExtensions(settings: Settings): Extension[] {
	return [
		EditorState.tabSize.of(settings.tabSize),
		indentUnit.of(settings.translateTabsToSpaces ? ' '.repeat(settings.tabSize) : '\t'),
		settings.wordWrap ? EditorView.lineWrapping : []
	];
}
