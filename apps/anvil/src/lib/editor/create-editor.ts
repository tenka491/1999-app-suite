import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { standardKeymap, history } from '@codemirror/commands';
import { syntaxHighlightExtension } from './syntax-highlight';

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
		syntaxHighlightExtension
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
