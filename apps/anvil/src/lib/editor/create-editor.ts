import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { standardKeymap, history } from '@codemirror/commands';
import { search } from '@codemirror/search';
import { syntaxHighlightExtension } from './syntax-highlight';
import { detectPlatform } from '../keymap/platform';
import { editorSettingsCompartment, computeEditorSettingsExtensions } from './editor-settings';
import { getSettings } from '../settings/settings-store.svelte';

const platform = detectPlatform();

// Reads CSS custom properties so a theme swap never requires touching this.
const theme = EditorView.theme(
	{
		'&': {
			height: '100%',
			color: 'var(--color-fg)',
			backgroundColor: 'var(--color-bg)',
			fontFamily: 'var(--font-mono)',
			// Session-only (F3), never written to settings.jsonc — see
			// font-size-state.svelte.ts, which sets this custom property.
			fontSize: 'var(--font-size-editor)',
			// Explicit and unitless (a multiplier of each element's own
			// font-size) rather than left to the browser's "normal" default —
			// .cm-content and .cm-gutters are different elements, and their
			// browser-default line-heights don't reliably resolve to the same
			// pixel value even with identical font-size, which is what made
			// line numbers drift out of alignment with their line as the font
			// size changed. Inheriting one explicit ratio keeps them locked
			// together at every size.
			lineHeight: '1.4'
		},
		'.cm-content': {
			caretColor: 'var(--color-fg)'
		},
		'.cm-gutters': {
			backgroundColor: 'var(--color-bg-elevated)',
			color: 'var(--color-fg-muted)',
			border: 'none'
		},
		'&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
			backgroundColor: 'var(--color-selection)'
		}
	},
	{ dark: true }
);

// standardKeymap only — cursor movement, basic text entry — not the fuller
// defaultKeymap (which bundles in historyKeymap). Undo/redo are now
// edit.undo/edit.redo commands dispatched through the JSON keymap, so they
// stay rebindable; history() is still needed here as the state extension
// those commands operate on.
export function baseExtensions(): Extension[] {
	return [
		lineNumbers(),
		highlightActiveLine(),
		history(),
		keymap.of(standardKeymap),
		theme,
		syntaxHighlightExtension,
		// Tab size, soft tabs, word wrap — read from current settings at
		// creation time; kept live afterward by reconfiguring this compartment
		// across every open document (see workspace-state.svelte.ts's
		// applyEditorSettingsToAllDocuments).
		editorSettingsCompartment.of(computeEditorSettingsExtensions(getSettings())),
		// Draws selections/cursors via DOM instead of the native browser
		// Selection API, which only reliably supports one range — required
		// for multiple cursors (F5) to render correctly, especially on
		// WebKit (this app's Linux target).
		drawSelection(),
		// Without this, EditorState silently collapses every transaction's
		// selection down to a single range (tr.newSelection.asSingle()) —
		// found the hard way: addCursorAbove/selectNextOccurrence/etc. all
		// appeared to "do nothing" because whatever they added got discarded
		// by state.update() itself, not by anything in F5's own commands.
		EditorState.allowMultipleSelections.of(true),
		// The search *state*, not CodeMirror's own search panel/keymap — the
		// find bar (F6) is our own Svelte component reading/writing this via
		// setSearchQuery/getSearchQuery.
		search(),
		// Mod-click adds a cursor (F5), matching the mod+d/mod+k mod+d keyboard path.
		EditorView.clickAddsSelectionRange.of((event) =>
			platform === 'macos' ? event.metaKey : event.ctrlKey
		)
	];
}

/** Mounts a single, long-lived EditorView. Per §4.1a, each Document owns its
 *  own EditorState; switching tabs calls `view.setState(doc.editorState)`
 *  (see workspace-state.svelte.ts) rather than destroying and recreating the
 *  view. This call just gives that view somewhere to live before the first
 *  document has loaded. */
export function mountEditorView(parent: HTMLElement): EditorView {
	return new EditorView({
		state: EditorState.create({ extensions: baseExtensions() }),
		parent
	});
}
