import { tags as t } from '@lezer/highlight';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';

// Reads CSS custom properties, same as the editor's base theme — a future
// theme swap (M5) needs no changes here.
const highlightStyle = HighlightStyle.define([
	{ tag: t.keyword, color: 'var(--syntax-keyword)' },
	{ tag: [t.string, t.special(t.string)], color: 'var(--syntax-string)' },
	{ tag: [t.number, t.bool, t.null], color: 'var(--syntax-number)' },
	{ tag: t.comment, color: 'var(--syntax-comment)', fontStyle: 'italic' },
	{ tag: [t.typeName, t.className, t.tagName], color: 'var(--syntax-type)' },
	{ tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--syntax-function)' },
	{ tag: t.invalid, color: 'var(--color-danger)' }
]);

export const syntaxHighlightExtension = syntaxHighlighting(highlightStyle);
