import type { EditorState } from '@codemirror/state';

export type LineEnding = 'lf' | 'crlf';

/** One open file (or untitled buffer) — the source of truth for its buffer.
 *  A tab never owns a buffer; it only references a Document by id (§4.1a). */
export interface Document {
	id: string;
	path: string | null;
	editorState: EditorState;
	isDirty: boolean;
	language: string;
	lineEnding: LineEnding;
	/** The content as of the last save (or load) — isDirty is computed by
	 *  comparing against this, not just "has an edit ever happened", so
	 *  undoing back to the saved state correctly clears the indicator. */
	savedContent: string;
}

export interface Tab {
	id: string;
	docId: string;
	isPreview: boolean;
}

/** v1 always has exactly one pane; the shape exists so panes are additive
 *  later instead of a rewrite (§4.1a). Do not build splitting on top of this. */
export interface Pane {
	id: string;
	tabs: Tab[];
	activeTabId: string | null;
}
