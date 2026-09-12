import type { EditorState } from '@codemirror/state';

export interface CursorInfo {
	line: number;
	column: number;
	selectionCount: number;
}

const DEFAULT_CURSOR: CursorInfo = { line: 1, column: 1, selectionCount: 1 };

let cursor = $state<CursorInfo>(DEFAULT_CURSOR);

export function getCursorInfo(): CursorInfo {
	return cursor;
}

export function computeCursorInfo(state: EditorState): CursorInfo {
	const range = state.selection.main;
	const line = state.doc.lineAt(range.head);
	return {
		line: line.number,
		column: range.head - line.from + 1,
		selectionCount: state.selection.ranges.length
	};
}

/** Called from the update listener on every transaction, and explicitly
 *  after `view.setState()` on tab switch — setState() doesn't itself fire an
 *  update event, so switching tabs would otherwise leave the status bar
 *  showing the previous document's cursor position. */
export function setCursorInfo(state: EditorState): void {
	cursor = computeCursorInfo(state);
}

export function resetCursorInfo(): void {
	cursor = DEFAULT_CURSOR;
}
