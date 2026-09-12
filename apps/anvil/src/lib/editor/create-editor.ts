import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
import { standardKeymap, history } from '@codemirror/commands';
import { search } from '@codemirror/search';
import { syntaxHighlightExtension } from './syntax-highlight';
import { detectPlatform } from '../keymap/platform';

const platform = detectPlatform();

// Reads CSS custom properties so a theme swap never requires touching this.
const theme = EditorView.theme(
	{
		'&': {
			height: '100%',
			color: 'var(--color-fg)',
			backgroundColor: 'var(--color-bg)',
			fontFamily: 'var(--font-mono)',
			fontSize: '14px'
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
