import { beforeEach, describe, expect, it, vi } from 'vitest';

// Module-level singleton state means every test needs a fresh module
// instance — vi.resetModules() + a dynamic re-import gives us that without
// exporting a test-only reset function from production code.
async function freshWorkspaceState() {
	vi.resetModules();
	return import('./workspace-state.svelte');
}

describe('workspace-state', () => {
	let ws: Awaited<ReturnType<typeof freshWorkspaceState>>;

	beforeEach(async () => {
		ws = await freshWorkspaceState();
	});

	it('opening a file creates a document and tab, and focuses it', () => {
		ws.openDocument('/a.txt', 'hello', 'lf', { preview: false });
		const doc = ws.getActiveDocument();
		expect(doc?.path).toBe('/a.txt');
		expect(doc?.editorState.doc.toString()).toBe('hello');
		expect(ws.getActivePane().tabs).toHaveLength(1);
	});

	it('opening an already-open path focuses the existing tab instead of duplicating', () => {
		ws.openDocument('/a.txt', 'hello', 'lf', { preview: false });
		const firstDocId = ws.getActiveDocument()?.id;
		ws.openDocument('/b.txt', 'world', 'lf', { preview: false });
		ws.openDocument('/a.txt', 'hello', 'lf', { preview: false });

		expect(ws.getActivePane().tabs).toHaveLength(2);
		expect(ws.getActiveDocument()?.id).toBe(firstDocId);
	});

	it('opening a second preview replaces the first rather than adding a tab', () => {
		ws.openDocument('/a.txt', 'a', 'lf', { preview: true });
		ws.openDocument('/b.txt', 'b', 'lf', { preview: true });

		const pane = ws.getActivePane();
		expect(pane.tabs).toHaveLength(1);
		expect(ws.getDocument(pane.tabs[0].docId)?.path).toBe('/b.txt');
	});

	it('opening a permanent tab while a different preview tab is open keeps both', () => {
		ws.openDocument('/a.txt', 'a', 'lf', { preview: true });
		ws.openDocument('/b.txt', 'b', 'lf', { preview: false });

		expect(ws.getActivePane().tabs).toHaveLength(2);
	});

	it('a non-preview open of an already-previewed file promotes it', () => {
		ws.openDocument('/a.txt', 'a', 'lf', { preview: true });
		const tab = ws.getActivePane().tabs[0];
		expect(tab.isPreview).toBe(true);

		ws.openDocument('/a.txt', 'a', 'lf', { preview: false });
		expect(ws.getActivePane().tabs[0].isPreview).toBe(false);
	});

	it('closing a tab with no unsaved changes removes it immediately', async () => {
		ws.openDocument('/a.txt', 'a', 'lf', { preview: false });
		const tab = ws.getActivePane().tabs[0];

		await ws.requestCloseTab(tab.id);

		expect(ws.getActivePane().tabs).toHaveLength(0);
		expect(ws.getDocument(tab.docId)).toBeNull();
	});

	it('reopening a closed tab re-focuses that path', async () => {
		// readFile() is invoked by reopenClosedTab; stub the Tauri IPC call it
		// goes through so this test doesn't need a real backend.
		vi.doMock('./file-io', () => ({
			readFile: vi.fn().mockResolvedValue({ contents: 'a', lineEnding: 'lf' })
		}));
		ws = await freshWorkspaceState();
		ws.openDocument('/a.txt', 'a', 'lf', { preview: false });
		await ws.requestCloseTab(ws.getActivePane().tabs[0].id);

		await ws.reopenClosedTab();
		expect(ws.getActiveDocument()?.path).toBe('/a.txt');
	});

	it('focusNextTab/focusPrevTab cycle through tabs in order', () => {
		ws.openDocument('/a.txt', 'a', 'lf', { preview: false });
		ws.openDocument('/b.txt', 'b', 'lf', { preview: false });
		ws.openDocument('/c.txt', 'c', 'lf', { preview: false });
		// Active tab is now /c.txt (index 2).

		ws.focusNextTab(); // wraps to index 0
		expect(ws.getActiveDocument()?.path).toBe('/a.txt');

		ws.focusPrevTab(); // wraps back to index 2
		expect(ws.getActiveDocument()?.path).toBe('/c.txt');
	});

	it('hasAnyDirtyDocuments and saveAllDirtyDocuments reflect document state', async () => {
		ws.openDocument('/a.txt', 'a', 'lf', { preview: false });
		expect(ws.hasAnyDirtyDocuments()).toBe(false);

		const doc = ws.getActiveDocument()!;
		doc.isDirty = true;
		expect(ws.hasAnyDirtyDocuments()).toBe(true);
	});

	it('saveDocument promotes a preview tab (F2.1: save promotes)', async () => {
		vi.doMock('./file-io', () => ({
			writeFile: vi.fn().mockResolvedValue(undefined),
			saveAsDialog: vi.fn()
		}));
		ws = await freshWorkspaceState();
		ws.openDocument('/a.txt', 'a', 'lf', { preview: true });
		const doc = ws.getActiveDocument()!;

		await ws.saveDocument(doc);

		expect(ws.getActivePane().tabs[0].isPreview).toBe(false);
	});
});
