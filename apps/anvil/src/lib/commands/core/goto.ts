import { openGotoAnything } from '../../ui/goto-anything-state.svelte';
import { openGotoLine } from '../../ui/goto-line-state.svelte';
import type { Command } from '../types';

export const gotoAnything: Command = {
	id: 'goto.anything',
	title: 'Go to Anything…',
	run() {
		openGotoAnything();
	}
};

export const gotoLine: Command = {
	id: 'goto.line',
	title: 'Go to Line…',
	run(ctx) {
		if (ctx.view) openGotoLine();
	}
};

export const gotoCommands: Command[] = [gotoAnything, gotoLine];
