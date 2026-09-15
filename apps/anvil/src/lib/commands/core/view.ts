import { increaseFontSize, decreaseFontSize, resetFontSize } from '../../editor/font-size-state.svelte';
import { getSettings, updateSetting } from '../../settings/settings-store.svelte';
import type { Command } from '../types';

export const viewFontSizeIncrease: Command = {
	id: 'view.font_size_increase',
	title: 'View: Increase Font Size',
	run() {
		increaseFontSize();
	}
};

export const viewFontSizeDecrease: Command = {
	id: 'view.font_size_decrease',
	title: 'View: Decrease Font Size',
	run() {
		decreaseFontSize();
	}
};

export const viewFontSizeReset: Command = {
	id: 'view.font_size_reset',
	title: 'View: Reset Font Size',
	run() {
		resetFontSize();
	}
};

export const viewToggleWordWrap: Command = {
	id: 'view.toggle_word_wrap',
	title: 'View: Toggle Word Wrap',
	async run() {
		await updateSetting('wordWrap', !getSettings().wordWrap);
	}
};

export const viewCommands: Command[] = [
	viewFontSizeIncrease,
	viewFontSizeDecrease,
	viewFontSizeReset,
	viewToggleWordWrap
];
