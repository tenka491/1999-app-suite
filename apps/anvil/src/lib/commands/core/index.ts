import { register } from '../registry.svelte';
import { fileCommands } from './file';
import { editCommands } from './edit';
import { paletteCommands } from './palette';
import { tabCommands } from './tab';
import { workspaceCommands } from './workspace';
import { gotoCommands } from './goto';

export function registerCoreCommands(): void {
	for (const command of [
		...fileCommands,
		...editCommands,
		...paletteCommands,
		...tabCommands,
		...workspaceCommands,
		...gotoCommands
	]) {
		register(command, 'core');
	}
}
