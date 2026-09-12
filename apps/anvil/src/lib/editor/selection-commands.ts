import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { SearchCursor } from '@codemirror/search';

/** Sublime's "skip occurrence" (mod+k mod+d): replace the last-added range
 *  with the *next* occurrence instead of adding another one. Not a built-in
 *  CodeMirror command — @codemirror/search's `selectNextOccurrence` only adds. */
export function skipOccurrence(view: EditorView): void {
	const { state } = view;
	const ranges = state.selection.ranges;
	const last = ranges[ranges.length - 1];

	// Nothing selected yet — same starting point as "select next occurrence".
	if (ranges.length === 1 && last.empty) {
		const word = state.wordAt(last.head);
		if (!word) return;
		view.dispatch({ selection: EditorSelection.create([EditorSelection.range(word.from, word.to)]) });
		return;
	}

	const text = state.sliceDoc(last.from, last.to);
	if (!text) return;

	let cursor = new SearchCursor(state.doc, text, last.to).next();
	if (cursor.done) cursor = new SearchCursor(state.doc, text, 0, last.to).next(); // wrap around
	if (cursor.done) return;

	const remaining = ranges.slice(0, -1);
	const nextRange = EditorSelection.range(cursor.value.from, cursor.value.to);
	view.dispatch({
		selection: EditorSelection.create([...remaining, nextRange], remaining.length),
		scrollIntoView: true
	});
}

/** Sublime's "split selection into lines" (mod+shift+l): a multi-line
 *  selection becomes one cursor per line, positioned at the end of each
 *  line's portion of the original selection. */
export function splitSelectionIntoLines(view: EditorView): void {
	const { state } = view;
	const newRanges = [];

	for (const range of state.selection.ranges) {
		if (range.empty) {
			newRanges.push(range);
			continue;
		}
		const startLine = state.doc.lineAt(range.from);
		const endLine = state.doc.lineAt(range.to);
		for (let lineNo = startLine.number; lineNo <= endLine.number; lineNo++) {
			const line = state.doc.line(lineNo);
			const to = lineNo === endLine.number ? range.to : line.to;
			newRanges.push(EditorSelection.cursor(to));
		}
	}

	view.dispatch({ selection: EditorSelection.create(newRanges) });
}
