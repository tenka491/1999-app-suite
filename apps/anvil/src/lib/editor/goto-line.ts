import type { EditorView } from '@codemirror/view';

/** Moves the cursor to the start of `lineNumber` (1-based) and scrolls it
 *  into view. Clamps out-of-range input rather than throwing. */
export function jumpToLine(view: EditorView, lineNumber: number): void {
	const clamped = Math.min(Math.max(lineNumber, 1), view.state.doc.lines);
	const line = view.state.doc.line(clamped);
	view.dispatch({
		selection: { anchor: line.from },
		scrollIntoView: true
	});
	view.focus();
}
