import { getSettings } from '../settings/settings-store.svelte';

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const STEP = 1;

// Starts at whatever getSettings() currently holds (the bundled fallback,
// before settings have loaded from disk — see settings-store's
// FALLBACK_SETTINGS) until initFontSize() seeds the real value.
let fontSize = $state(getSettings().fontSize);

export function getFontSize(): number {
	return fontSize;
}

/** Resets the session font size back to settings.font_size — the same
 *  operation as the initial seed below, exposed separately since the
 *  view.font_size_reset command's call site (any time, user-invoked) is a
 *  different use case from the startup one, even though they do the same
 *  thing. */
export function resetFontSize(): void {
	fontSize = getSettings().fontSize;
}

/** Seeds the session font size from settings.font_size. Call once, right
 *  after settings have actually finished loading from disk (see the call
 *  site in +layout.svelte) — not on every subsequent settings change, since
 *  font size is session-only (F3) and shouldn't snap back just because the
 *  user edited an unrelated setting after already zooming in/out. */
export function initFontSize(): void {
	resetFontSize();
}

export function increaseFontSize(): void {
	fontSize = Math.min(MAX_FONT_SIZE, fontSize + STEP);
}

export function decreaseFontSize(): void {
	fontSize = Math.max(MIN_FONT_SIZE, fontSize - STEP);
}
