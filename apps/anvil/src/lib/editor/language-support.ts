import { Compartment, type Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { sass } from '@codemirror/lang-sass';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { rust } from '@codemirror/lang-rust';
import { svelte } from '@replit/codemirror-lang-svelte';
import { elixir } from 'codemirror-lang-elixir';
import { php } from '@codemirror/lang-php';
import { yaml } from '@codemirror/lang-yaml';

// Shared across every document's EditorState (each state tracks its own
// compartment contents independently) — lets a document's language be
// swapped in place via `view.dispatch({ effects: languageCompartment.reconfigure(...) })`
// when Save As gives an untitled buffer a real extension for the first time,
// instead of needing to rebuild the whole state.
export const languageCompartment = new Compartment();

function extensionOf(path: string): string {
	const dot = path.lastIndexOf('.');
	return dot === -1 ? '' : path.slice(dot + 1).toLowerCase();
}

/** Extension (not display label — see workspace/language.ts for that) for
 *  the file's syntax highlighting/indentation support. Unknown extensions
 *  (and `.heex`, which codemirror-lang-elixir doesn't parse) fall through to
 *  plain text, per PRD §F4. PHP and YAML are additions beyond the PRD's F4
 *  list, added on request during M4. */
export function getLanguageSupport(path: string | null): Extension[] {
	if (!path) return [];
	switch (extensionOf(path)) {
		case 'ts':
		case 'tsx':
			return [javascript({ jsx: true, typescript: true })];
		case 'js':
		case 'jsx':
			return [javascript({ jsx: true })];
		case 'svelte':
			return [svelte()];
		case 'html':
			return [html()];
		case 'css':
			return [css()];
		case 'scss':
			return [sass()];
		case 'sass':
			return [sass({ indented: true })];
		case 'json':
		case 'jsonc':
			return [json()];
		case 'md':
			return [markdown()];
		case 'rs':
			return [rust()];
		case 'ex':
		case 'exs':
			return [elixir()];
		case 'php':
			return [php()];
		case 'yaml':
		case 'yml':
			return [yaml()];
		default:
			return [];
	}
}
