// A display label only — not a CodeMirror language extension. Real syntax
// highlighting (F4) is M4; the status bar just needs something to show.
const EXTENSION_LANGUAGE: Record<string, string> = {
	ts: 'TypeScript',
	tsx: 'TypeScript',
	js: 'JavaScript',
	jsx: 'JavaScript',
	svelte: 'Svelte',
	html: 'HTML',
	css: 'CSS',
	scss: 'SCSS',
	sass: 'Sass',
	json: 'JSON',
	jsonc: 'JSON',
	md: 'Markdown',
	rs: 'Rust',
	ex: 'Elixir',
	exs: 'Elixir',
	heex: 'Elixir'
};

export function detectLanguage(path: string | null): string {
	if (!path) return 'Plain Text';
	const dot = path.lastIndexOf('.');
	if (dot === -1) return 'Plain Text';
	const ext = path.slice(dot + 1).toLowerCase();
	return EXTENSION_LANGUAGE[ext] ?? 'Plain Text';
}
