/** Anvil's settings (PRD §4.4). Field names are camelCase here; the on-disk
 *  JSONC file uses snake_case, translated at the parse boundary in parse.ts
 *  (same split as the search IPC results in workspace/file-io.ts). */
export interface Settings {
	theme: string;
	fontSize: number;
	tabSize: number;
	translateTabsToSpaces: boolean;
	wordWrap: boolean;
	trimTrailingWhitespaceOnSave: boolean;
	ensureNewlineAtEofOnSave: boolean;
}

/** Maps each Settings field to its on-disk key. The single source of truth
 *  for the camelCase/snake_case split — parse.ts and settings-store.svelte.ts
 *  both read from this instead of duplicating the field list. */
export const SETTINGS_KEYS: Record<keyof Settings, string> = {
	theme: 'theme',
	fontSize: 'font_size',
	tabSize: 'tab_size',
	translateTabsToSpaces: 'translate_tabs_to_spaces',
	wordWrap: 'word_wrap',
	trimTrailingWhitespaceOnSave: 'trim_trailing_whitespace_on_save',
	ensureNewlineAtEofOnSave: 'ensure_newline_at_eof_on_save'
};
