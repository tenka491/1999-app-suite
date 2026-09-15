import { register } from '../registry.svelte';
import { fileCommands } from './file';
import { editCommands } from './edit';
import { paletteCommands } from './palette';
import { tabCommands } from './tab';
import { workspaceCommands } from './workspace';
import { gotoCommands } from './goto';
import { selectionCommands } from './selection';
import { findCommands } from './find';
import { preferencesCommands } from './preferences';
import { themeCommands } from './theme';
import { viewCommands } from './view';

export function registerCoreCommands(): void {
	for (const command of [
		...fileCommands,
		...editCommands,
		...paletteCommands,
		...tabCommands,
		...workspaceCommands,
		...gotoCommands,
		...selectionCommands,
		...findCommands,
		...preferencesCommands,
		...themeCommands,
		...viewCommands
	]) {
		register(command, 'core');
	}
}
