import { SvelteMap } from 'svelte/reactivity';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { baseExtensions } from '../editor/create-editor';
import { getActiveView } from './active-view.svelte';
import { detectLanguage } from './language';
import { readFile, writeFile, saveAsDialog } from './file-io';
import { askUnsavedChanges } from '../ui/confirm.svelte';
import { setCursorInfo, resetCursorInfo } from '../editor/cursor-state.svelte';
import type { Document, LineEnding, Pane, Tab } from './types';

function generateId(): string {
	return crypto.randomUUID();
}

function createPane(): Pane {
	return { id: generateId(), tabs: [], activeTabId: null };
}

// SvelteMap makes key add/remove/replace reactive, but — per its own docs —
// values are *not* made deeply reactive. Every document update below goes
// through `documents.set(id, { ...doc, ...changes })` for that reason;
// mutating a field on an object already pulled out of the map (`doc.path =
// x`) silently does nothing anyone reactive will see.
const documents = new SvelteMap<string, Document>();
const panes = $state<Pane[]>([createPane()]);
let activePaneId = $state<string>(panes[0].id);

/** Only path-based closes are remembered — an untitled buffer closed without
 *  saving has nothing on disk to reopen, and restoring in-memory content for
 *  it is more machinery than v1 needs (a deliberate simplification). */
const closedTabHistory: string[] = [];

function markDirty(docId: string, newState: EditorState): void {
	const doc = documents.get(docId);
	if (!doc) return;
	documents.set(docId, { ...doc, editorState: newState, isDirty: true });
	promoteDocumentTabs(docId); // an edit promotes a preview tab (F2.1)
}

function syncEditorState(docId: string, newState: EditorState): void {
	const doc = documents.get(docId);
	if (doc) documents.set(docId, { ...doc, editorState: newState });
}

function createDocumentState(docId: string, contents: string): EditorState {
	return EditorState.create({
		doc: contents,
		extensions: [
			...baseExtensions(),
			EditorView.updateListener.of((update) => {
				if (update.docChanged) markDirty(docId, update.state);
				else if (update.state !== update.startState) syncEditorState(docId, update.state);
				if (update.docChanged || update.selectionSet) setCursorInfo(update.state);
			})
		]
	});
}

function promoteDocumentTabs(docId: string): void {
	for (const pane of panes) {
		const tab = pane.tabs.find((t) => t.docId === docId);
		if (tab?.isPreview) tab.isPreview = false;
	}
}

export function getActivePane(): Pane {
	return panes.find((p) => p.id === activePaneId) ?? panes[0];
}

export function getPanes(): Pane[] {
	return panes;
}

export function getActiveTab(): Tab | null {
	const pane = getActivePane();
	return pane.tabs.find((t) => t.id === pane.activeTabId) ?? null;
}

export function getActiveDocument(): Document | null {
	const tab = getActiveTab();
	return tab ? (documents.get(tab.docId) ?? null) : null;
}

export function getDocument(docId: string): Document | null {
	return documents.get(docId) ?? null;
}

function focusTab(pane: Pane, tab: Tab): void {
	pane.activeTabId = tab.id;
	const doc = documents.get(tab.docId);
	const view = getActiveView();
	if (view && doc) {
		view.setState(doc.editorState);
		view.focus();
		setCursorInfo(doc.editorState);
	}
}

/** The shared entry point for "show me this file": sidebar clicks, Goto
 *  Anything, file.open, and file.new all funnel through here (§F1, §F2.1). */
export function openDocument(
	path: string | null,
	contents: string,
	lineEnding: LineEnding,
	options: { preview: boolean }
): void {
	const pane = getActivePane();

	if (path) {
		const existingTab = pane.tabs.find((t) => documents.get(t.docId)?.path === path);
		if (existingTab) {
			if (!options.preview) promoteDocumentTabs(existingTab.docId);
			focusTab(pane, existingTab);
			return;
		}
	}

	const docId = generateId();
	const document: Document = {
		id: docId,
		path,
		editorState: createDocumentState(docId, contents),
		isDirty: false,
		language: detectLanguage(path),
		lineEnding
	};
	documents.set(docId, document);

	if (options.preview) {
		const existingPreview = pane.tabs.find((t) => t.isPreview);
		if (existingPreview) closeTabSilently(pane, existingPreview);
	}

	const tab: Tab = { id: generateId(), docId, isPreview: options.preview };
	pane.tabs.push(tab);
	focusTab(pane, tab);
}

export function createUntitledDocument(): void {
	// file.new is always permanent (F2.1).
	openDocument(null, '', 'lf', { preview: false });
}

export async function saveDocument(doc: Document, options: { forcePrompt?: boolean } = {}): Promise<boolean> {
	const contents = doc.editorState.doc.toString();
	let path = doc.path;
	let language = doc.language;
	if (!path || options.forcePrompt) {
		const chosen = await saveAsDialog();
		if (!chosen) return false;
		path = chosen;
		language = detectLanguage(path);
	}
	await writeFile(path, contents, doc.lineEnding);
	documents.set(doc.id, { ...doc, path, language, isDirty: false });
	promoteDocumentTabs(doc.id);
	return true;
}

/** Removes a tab (and its document, if nothing else references it) with no
 *  dirty check and no history entry — used internally when a preview tab is
 *  replaced by a new one, which is not a user-visible "close". */
function closeTabSilently(pane: Pane, tab: Tab): void {
	pane.tabs = pane.tabs.filter((t) => t.id !== tab.id);
	if (!pane.tabs.some((t) => t.docId === tab.docId)) documents.delete(tab.docId);
	if (pane.activeTabId === tab.id) pane.activeTabId = pane.tabs.at(-1)?.id ?? null;
}

async function closeTab(pane: Pane, tab: Tab): Promise<void> {
	const doc = documents.get(tab.docId);
	if (doc?.isDirty) {
		const choice = await askUnsavedChanges(`Save changes to ${doc.path ?? 'Untitled'}?`);
		if (choice === 'cancel') return;
		if (choice === 'save' && !(await saveDocument(doc))) return; // save cancelled/failed — don't close
	}

	if (doc?.path) closedTabHistory.push(doc.path);
	closeTabSilently(pane, tab);

	const nextActive = pane.tabs.find((t) => t.id === pane.activeTabId);
	const view = getActiveView();
	if (view) {
		const nextDoc = nextActive ? documents.get(nextActive.docId) : null;
		if (nextDoc) {
			view.setState(nextDoc.editorState);
			setCursorInfo(nextDoc.editorState);
		} else {
			view.setState(EditorState.create({ extensions: baseExtensions() }));
			resetCursorInfo();
		}
		view.focus();
	}
}

export async function closeActiveTab(): Promise<void> {
	const pane = getActivePane();
	const tab = getActiveTab();
	if (tab) await closeTab(pane, tab);
}

export function focusNextTab(): void {
	const pane = getActivePane();
	if (pane.tabs.length === 0) return;
	const index = pane.tabs.findIndex((t) => t.id === pane.activeTabId);
	focusTab(pane, pane.tabs[(index + 1) % pane.tabs.length]);
}

export function focusPrevTab(): void {
	const pane = getActivePane();
	if (pane.tabs.length === 0) return;
	const index = pane.tabs.findIndex((t) => t.id === pane.activeTabId);
	focusTab(pane, pane.tabs[(index - 1 + pane.tabs.length) % pane.tabs.length]);
}

export function focusTabById(tabId: string): void {
	const pane = getActivePane();
	const tab = pane.tabs.find((t) => t.id === tabId);
	if (tab) focusTab(pane, tab);
}

/** Double-clicking a tab (or the sidebar entry) promotes it out of preview
 *  without changing focus (F2.1). */
export function promoteTabById(tabId: string): void {
	const pane = getActivePane();
	const tab = pane.tabs.find((t) => t.id === tabId);
	if (tab) promoteDocumentTabs(tab.docId);
}

export function keepActiveTabOpen(): void {
	const tab = getActiveTab();
	if (tab) promoteDocumentTabs(tab.docId);
}

export async function requestCloseTab(tabId: string): Promise<void> {
	const pane = getActivePane();
	const tab = pane.tabs.find((t) => t.id === tabId);
	if (tab) await closeTab(pane, tab);
}

export async function reopenClosedTab(): Promise<void> {
	const path = closedTabHistory.pop();
	if (!path) return;
	const { contents, lineEnding } = await readFile(path);
	openDocument(path, contents, lineEnding, { preview: false });
}

export function hasAnyDirtyDocuments(): boolean {
	return Array.from(documents.values()).some((doc) => doc.isDirty);
}

/** Returns false if the user cancelled a save-as prompt along the way — the
 *  caller (the quit handler) should treat that as "don't quit". */
export async function saveAllDirtyDocuments(): Promise<boolean> {
	for (const doc of documents.values()) {
		if (doc.isDirty && !(await saveDocument(doc))) return false;
	}
	return true;
}
