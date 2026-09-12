import type { EditorView } from '@codemirror/view';
import { openFileDialog, writeFile, saveFileAsDialog } from '../../workspace/file-io';
import { getCurrentFilePath, setCurrentFilePath } from '../../workspace/current-file.svelte';
import type { Command } from '../types';

function replaceViewContent(view: EditorView, contents: string): void {
	view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: contents } });
}

export const fileOpen: Command = {
	id: 'file.open',
	title: 'File: Open…',
	async run(ctx) {
		const result = await openFileDialog();
		if (!result) return;
		setCurrentFilePath(result.path);
		if (ctx.view) replaceViewContent(ctx.view, result.contents);
	}
};

export const fileSave: Command = {
	id: 'file.save',
	title: 'File: Save',
	async run(ctx) {
		if (!ctx.view) return;
		const contents = ctx.view.state.doc.toString();
		const path = getCurrentFilePath();
		if (path) {
			await writeFile(path, contents);
		} else {
			const savedPath = await saveFileAsDialog(contents);
			if (savedPath) setCurrentFilePath(savedPath);
		}
	}
};

export const fileSaveAs: Command = {
	id: 'file.save_as',
	title: 'File: Save As…',
	async run(ctx) {
		if (!ctx.view) return;
		const contents = ctx.view.state.doc.toString();
		const savedPath = await saveFileAsDialog(contents);
		if (savedPath) setCurrentFilePath(savedPath);
	}
};

export const fileCommands: Command[] = [fileOpen, fileSave, fileSaveAs];
