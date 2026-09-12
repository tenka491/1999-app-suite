import { describe, expect, it } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { baseExtensions } from './create-editor';

describe('baseExtensions', () => {
	it('preserves multi-range selections (allowMultipleSelections)', () => {
		// Without EditorState.allowMultipleSelections.of(true), CodeMirror
		// silently collapses every transaction's selection down to one range
		// (tr.newSelection.asSingle()) — this broke every F5 multi-cursor
		// command (selectNextOccurrence, addCursorAbove/Below, etc.) even
		// though none of their own logic was at fault.
		const state = EditorState.create({
			doc: 'foo bar foo baz foo',
			extensions: baseExtensions()
		});

		const withTwoRanges = state.selection.addRange(EditorSelection.range(8, 11), false);
		const updated = state.update({ selection: withTwoRanges });

		expect(updated.state.selection.ranges.length).toBe(2);
	});
});
