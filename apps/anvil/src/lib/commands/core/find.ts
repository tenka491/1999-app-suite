import { findNext, findPrevious, getSearchQuery } from '@codemirror/search';
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

// findNext/findPrevious are internally wrapped so that an *invalid* query
// (no search performed yet, or the box was cleared) falls back to opening
// CodeMirror's own built-in search panel — a second, native find UI we don't
// use anywhere else and don't wire a close keybinding for (we deliberately
// exclude searchKeymap). Guarding on validity here is what keeps F3/mod+g
// from ever triggering that fallback.
export const findNextCommand: Command = {
	id: 'find.next',
	title: 'Find: Next',
	run(ctx) {
		if (ctx.view && getSearchQuery(ctx.view.state).valid) findNext(ctx.view);
	}
};

export const findPrevCommand: Command = {
	id: 'find.prev',
	title: 'Find: Previous',
	run(ctx) {
		if (ctx.view && getSearchQuery(ctx.view.state).valid) findPrevious(ctx.view);
	}
};

export const findCommands: Command[] = [findShow, findShowReplace, findNextCommand, findPrevCommand];
