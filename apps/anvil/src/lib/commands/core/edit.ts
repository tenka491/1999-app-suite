import { undo, redo } from '@codemirror/commands';
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

export const editCommands: Command[] = [editUndo, editRedo];
