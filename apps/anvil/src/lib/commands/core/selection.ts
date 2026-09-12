import { selectNextOccurrence, selectSelectionMatches } from '@codemirror/search';
import { addCursorAbove, addCursorBelow, selectLine, simplifySelection } from '@codemirror/commands';
import { skipOccurrence, splitSelectionIntoLines } from '../../editor/selection-commands';
import type { Command } from '../types';

export const selectionFindNextOccurrence: Command = {
	id: 'selection.find_next_occurrence',
	title: 'Selection: Find Next Occurrence',
	run(ctx) {
		if (ctx.view) selectNextOccurrence(ctx.view);
	}
};

export const selectionSkipOccurrence: Command = {
	id: 'selection.skip_occurrence',
	title: 'Selection: Skip Occurrence',
	run(ctx) {
		if (ctx.view) skipOccurrence(ctx.view);
	}
};

export const selectionFindAll: Command = {
	id: 'selection.find_all',
	title: 'Selection: Find All',
	run(ctx) {
		if (ctx.view) selectSelectionMatches(ctx.view);
	}
};

export const selectionSplitIntoLines: Command = {
	id: 'selection.split_into_lines',
	title: 'Selection: Split into Lines',
	run(ctx) {
		if (ctx.view) splitSelectionIntoLines(ctx.view);
	}
};

export const selectionAddCursorAbove: Command = {
	id: 'selection.add_cursor_above',
	title: 'Selection: Add Cursor Above',
	run(ctx) {
		if (ctx.view) addCursorAbove(ctx.view);
	}
};

export const selectionAddCursorBelow: Command = {
	id: 'selection.add_cursor_below',
	title: 'Selection: Add Cursor Below',
	run(ctx) {
		if (ctx.view) addCursorBelow(ctx.view);
	}
};

export const selectionSelectLine: Command = {
	id: 'selection.select_line',
	title: 'Selection: Select Line',
	run(ctx) {
		if (ctx.view) selectLine(ctx.view);
	}
};

export const selectionCollapse: Command = {
	id: 'selection.collapse',
	title: 'Selection: Collapse to Single Cursor',
	hidden: true, // bound to a bare Escape, not something you'd search for in the palette
	run(ctx) {
		if (ctx.view) simplifySelection(ctx.view);
	}
};

export const selectionCommands: Command[] = [
	selectionFindNextOccurrence,
	selectionSkipOccurrence,
	selectionFindAll,
	selectionSplitIntoLines,
	selectionAddCursorAbove,
	selectionAddCursorBelow,
	selectionSelectLine,
	selectionCollapse
];
