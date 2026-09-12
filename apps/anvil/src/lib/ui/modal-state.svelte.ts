import { isPaletteOpen } from './palette-state.svelte';
import { isGotoAnythingOpen } from './goto-anything-state.svelte';
import { isGotoLineOpen } from './goto-line-state.svelte';
import { getConfirmRequest } from './confirm.svelte';

/** True whenever any overlay owns keyboard input — the global keymap
 *  resolver checks this once rather than importing every overlay's own
 *  open-state individually. */
export function isAnyModalOpen(): boolean {
	return isPaletteOpen() || isGotoAnythingOpen() || isGotoLineOpen() || getConfirmRequest() !== null;
}
