import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { standardKeymap, history } from '@codemirror/commands';

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
export function createEditorView(parent: HTMLElement, doc: string): EditorView {
	return new EditorView({
		state: EditorState.create({
			doc,
			extensions: [lineNumbers(), highlightActiveLine(), history(), keymap.of(standardKeymap), theme]
		}),
		parent
	});
}
