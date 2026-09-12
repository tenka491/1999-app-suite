import type { EditorView } from '@codemirror/view';

// The invariant #4 accessor: every command reaches the editor through this,
// never by holding its own reference. Trivial today (there's exactly one
// view); M2 only has to change what's inside these two functions once the
// real document/pane model exists.
let activeView = $state<EditorView | null>(null);

export function getActiveView(): EditorView | null {
	return activeView;
}

export function setActiveView(view: EditorView | null): void {
	activeView = view;
}
