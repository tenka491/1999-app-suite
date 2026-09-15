import { openThemeSwitch } from '../../ui/theme-switch-state.svelte';
import type { Command } from '../types';

export const themeSwitch: Command = {
	id: 'theme.switch',
	title: 'Theme: Switch',
	run() {
		openThemeSwitch();
	}
};

export const themeCommands: Command[] = [themeSwitch];
