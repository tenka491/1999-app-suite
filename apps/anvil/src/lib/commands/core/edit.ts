import {
	undo,
	redo,
	deleteLine,
	copyLineDown,
	moveLineUp,
	moveLineDown,
	toggleComment,
	indentMore,
	indentLess
} from '@codemirror/commands';
import type { Command } from '../types';

export const editUndo: Command = {
	id: 'edit.undo',
	title: 'Edit: Undo',
	run(ctx) {
		if (ctx.view) undo(ctx.view);
	}
};

export const editRedo: Command = {
	id: 'edit.redo',
	title: 'Edit: Redo',
	run(ctx) {
		if (ctx.view) redo(ctx.view);
	}
};

export const editDeleteLine: Command = {
	id: 'edit.delete_line',
	title: 'Edit: Delete Line',
	run(ctx) {
		if (ctx.view) deleteLine(ctx.view);
	}
};

export const editDuplicateLine: Command = {
	id: 'edit.duplicate_line',
	title: 'Edit: Duplicate Line',
	run(ctx) {
		if (ctx.view) copyLineDown(ctx.view);
	}
};

export const editMoveLineUp: Command = {
	id: 'edit.move_line_up',
	title: 'Edit: Move Line Up',
	run(ctx) {
		if (ctx.view) moveLineUp(ctx.view);
	}
};

export const editMoveLineDown: Command = {
	id: 'edit.move_line_down',
	title: 'Edit: Move Line Down',
	run(ctx) {
		if (ctx.view) moveLineDown(ctx.view);
	}
};

export const editToggleComment: Command = {
	id: 'edit.toggle_comment',
	title: 'Edit: Toggle Comment',
	run(ctx) {
		if (ctx.view) toggleComment(ctx.view);
	}
};

export const editIndent: Command = {
	id: 'edit.indent',
	title: 'Edit: Indent',
	run(ctx) {
		if (ctx.view) indentMore(ctx.view);
	}
};

export const editOutdent: Command = {
	id: 'edit.outdent',
	title: 'Edit: Outdent',
	run(ctx) {
		if (ctx.view) indentLess(ctx.view);
	}
};

export const editCommands: Command[] = [
	editUndo,
	editRedo,
	editDeleteLine,
	editDuplicateLine,
	editMoveLineUp,
	editMoveLineDown,
	editToggleComment,
	editIndent,
	editOutdent
];
