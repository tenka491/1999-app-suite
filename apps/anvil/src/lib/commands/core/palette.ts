import { openPalette } from '../../ui/palette-state.svelte';
import type { Command } from '../types';

export const paletteShow: Command = {
	id: 'palette.show',
	title: 'Show Command Palette',
	run() {
		openPalette();
	}
};

export const paletteCommands: Command[] = [paletteShow];
