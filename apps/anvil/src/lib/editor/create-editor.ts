import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';

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

// Deliberately minimal: no search/fold/autocomplete keymaps. Real bindings
// come from the JSON keymap system in M1 — this is just enough to type,
// move the cursor, and undo/redo while proving CodeMirror mounts.
export function createEditorView(parent: HTMLElement, doc: string): EditorView {
	return new EditorView({
		state: EditorState.create({
			doc,
			extensions: [
				lineNumbers(),
				highlightActiveLine(),
				history(),
				keymap.of([...defaultKeymap, ...historyKeymap]),
				theme
			]
		}),
		parent
	});
}
