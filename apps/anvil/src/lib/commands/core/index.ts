import { register } from '../registry.svelte';
import { fileCommands } from './file';
import { editCommands } from './edit';
import { paletteCommands } from './palette';

export function registerCoreCommands(): void {
	for (const command of [...fileCommands, ...editCommands, ...paletteCommands]) {
		register(command, 'core');
	}
}
