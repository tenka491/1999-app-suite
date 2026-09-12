import type { EditorView } from '@codemirror/view';
import type { Document, Pane } from '../workspace/types';

export interface CommandContext {
	/** The active pane's active view. */
	view: EditorView | null;
	doc: Document | null;
	pane: Pane;
}

export interface Command {
	id: string;
	title: string;
	run: (ctx: CommandContext, args?: Record<string, unknown>) => void | Promise<void>;
	/** Excluded from the palette (e.g. a future `tab.focus` with an index arg). */
	hidden?: boolean;
}
