import { readFile } from '../../workspace/file-io';
import { openDocument } from '../../workspace/workspace-state.svelte';
import { openFolder } from '../../workspace/folder-tree.svelte';
import { toggleSidebar } from '../../ui/sidebar-state.svelte';
import type { Command } from '../types';

export const workspaceOpenFolder: Command = {
	id: 'workspace.open_folder',
	title: 'Workspace: Open Folder…',
	async run() {
		await openFolder();
	}
};

/** What sidebar clicks actually call — kept as a command (not a plain
 *  function import) so opening a file from the sidebar goes through the same
 *  run() error-to-toast handling as every other action (PRD §4.2, §11).
 *  Hidden because `args.path` makes it meaningless from the palette. */
export const workspaceOpenPath: Command = {
	id: 'workspace.open_path',
	title: 'Open Path',
	hidden: true,
	async run(_ctx, args) {
		const path = args?.path as string;
		const preview = Boolean(args?.preview);
		const { contents, lineEnding } = await readFile(path);
		openDocument(path, contents, lineEnding, { preview });
	}
};

export const sidebarToggle: Command = {
	id: 'sidebar.toggle',
	title: 'View: Toggle Sidebar',
	run() {
		toggleSidebar();
	}
};

export const workspaceCommands: Command[] = [workspaceOpenFolder, workspaceOpenPath, sidebarToggle];
