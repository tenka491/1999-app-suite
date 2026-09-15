export interface ThemeOption {
	id: string;
	name: string;
	/** The `data-theme` attribute value each theme's CSS block is keyed on
	 *  (styles/themes/*.scss) — separate from `id` since more theme ids could
	 *  ship later while still only needing a dark/light CSS split. */
	dataTheme: 'dark' | 'light';
}

export const THEMES: ThemeOption[] = [
	{ id: '1999-dark', name: '1999 Dark', dataTheme: 'dark' },
	{ id: '1999-light', name: '1999 Light', dataTheme: 'light' }
];

const DEFAULT_DATA_THEME: ThemeOption['dataTheme'] = 'dark';

export function resolveDataTheme(themeId: string): ThemeOption['dataTheme'] {
	return THEMES.find((theme) => theme.id === themeId)?.dataTheme ?? DEFAULT_DATA_THEME;
}
