import { openFileDialog, readFile } from '../../workspace/file-io';
import { openDocument, saveDocument, createUntitledDocument } from '../../workspace/workspace-state.svelte';
import type { Command } from '../types';

export const fileOpen: Command = {
	id: 'file.open',
	title: 'File: Open…',
	async run() {
		const picked = await openFileDialog();
		if (!picked) return;
		const { contents, lineEnding } = await readFile(picked.path);
		// A deliberate, explicit Open is a permanent tab, not a preview (F2.1).
		openDocument(picked.path, contents, lineEnding, { preview: false });
	}
};

export const fileNew: Command = {
	id: 'file.new',
	title: 'File: New',
	run() {
		createUntitledDocument();
	}
};

export const fileSave: Command = {
	id: 'file.save',
	title: 'File: Save',
	async run(ctx) {
		if (ctx.doc) await saveDocument(ctx.doc);
	}
};

export const fileSaveAs: Command = {
	id: 'file.save_as',
	title: 'File: Save As…',
	async run(ctx) {
		if (ctx.doc) await saveDocument(ctx.doc, { forcePrompt: true });
	}
};

export const fileCommands: Command[] = [fileOpen, fileNew, fileSave, fileSaveAs];
