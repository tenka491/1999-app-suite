import type { EditorView } from '@codemirror/view';

/** Kept minimal for now — just the active view. The fuller shape from PRD
 *  §4.1a (`{ view, doc, pane, workspace }`) is real M2 work; expanding this
 *  early would mean building the document/pane model prematurely. */
export interface CommandContext {
	view: EditorView | null;
}

export interface Command {
	id: string;
	title: string;
	run: (ctx: CommandContext, args?: Record<string, unknown>) => void | Promise<void>;
	/** Excluded from the palette (e.g. a future `tab.focus` with an index arg). */
	hidden?: boolean;
}
