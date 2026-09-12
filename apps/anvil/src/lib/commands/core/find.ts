import { findNext, findPrevious } from '@codemirror/search';
import { openFindBar } from '../../ui/find-bar-state.svelte';
import type { Command } from '../types';

export const findShow: Command = {
	id: 'find.show',
	title: 'Find…',
	run(ctx) {
		if (ctx.view) openFindBar(false);
	}
};

export const findShowReplace: Command = {
	id: 'find.show_replace',
	title: 'Find and Replace…',
	run(ctx) {
		if (ctx.view) openFindBar(true);
	}
};

export const findNextCommand: Command = {
	id: 'find.next',
	title: 'Find: Next',
	run(ctx) {
		if (ctx.view) findNext(ctx.view);
	}
};

export const findPrevCommand: Command = {
	id: 'find.prev',
	title: 'Find: Previous',
	run(ctx) {
		if (ctx.view) findPrevious(ctx.view);
	}
};

export const findCommands: Command[] = [findShow, findShowReplace, findNextCommand, findPrevCommand];
