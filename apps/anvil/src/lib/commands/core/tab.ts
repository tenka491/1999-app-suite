import {
	closeActiveTab,
	focusNextTab,
	focusPrevTab,
	reopenClosedTab,
	keepActiveTabOpen
} from '../../workspace/workspace-state.svelte';
import type { Command } from '../types';

export const tabClose: Command = {
	id: 'tab.close',
	title: 'Tab: Close',
	async run() {
		await closeActiveTab();
	}
};

export const tabNext: Command = {
	id: 'tab.next',
	title: 'Tab: Next Tab',
	run() {
		focusNextTab();
	}
};

export const tabPrev: Command = {
	id: 'tab.prev',
	title: 'Tab: Previous Tab',
	run() {
		focusPrevTab();
	}
};

export const tabReopenClosed: Command = {
	id: 'tab.reopen_closed',
	title: 'Tab: Reopen Closed Tab',
	async run() {
		await reopenClosedTab();
	}
};

export const tabKeepOpen: Command = {
	id: 'tab.keep_open',
	title: 'Tab: Keep Open',
	run() {
		keepActiveTabOpen();
	}
};

export const tabCommands: Command[] = [tabClose, tabNext, tabPrev, tabReopenClosed, tabKeepOpen];
