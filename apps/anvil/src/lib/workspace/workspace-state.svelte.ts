import { untrack } from 'svelte';
import { listen } from '@tauri-apps/api/event';
import { SvelteMap } from 'svelte/reactivity';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { baseExtensions } from '../editor/create-editor';
import { editorSettingsCompartment, computeEditorSettingsExtensions } from '../editor/editor-settings';
import { getActiveView } from './active-view.svelte';
import { detectLanguage } from './language';
import { getLanguageSupport, languageCompartment } from '../editor/language-support';
import { readFile, writeFile, saveAsDialog, watchFile, unwatchFile } from './file-io';
import { askUnsavedChanges } from '../ui/confirm.svelte';
import { showToast } from '../ui/toast-store.svelte';
import { setCursorInfo, resetCursorInfo } from '../editor/cursor-state.svelte';
import { getSettings } from '../settings/settings-store.svelte';
import type { Settings } from '../settings/types';
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

// watchFile/unwatchFile are best-effort background infra for §F2 — a
// failure here just means external-change reload silently won't work for
// that one file. Not worth a toast (imagine opening 20 files under a
// permissions-restricted directory) or worth blocking any caller on.
function watchFileQuietly(path: string): void {
	watchFile(path).catch(() => {});
}

function unwatchFileQuietly(path: string): void {
	unwatchFile(path).catch(() => {});
}

// Length check first: comparing the full text on every keystroke would be
// wasteful for a large file, but two lengths differing (the common case
// while actively editing) rules it out without ever touching the content.
function contentMatches(newState: EditorState, savedContent: string): boolean {
	if (newState.doc.length !== savedContent.length) return false;
	return newState.doc.toString() === savedContent;
}

function trimTrailingWhitespace(contents: string): string {
	return contents
		.split('\n')
		.map((line) => line.replace(/[ \t]+$/, ''))
		.join('\n');
}

// Deliberately a no-op on a genuinely empty file — there's no unterminated
// last line to close, so adding one would just be inventing content.
function ensureTrailingNewline(contents: string): string {
	return contents.length === 0 || contents.endsWith('\n') ? contents : contents + '\n';
}

function markDirty(docId: string, newState: EditorState): void {
	const doc = documents.get(docId);
	if (!doc) return;
	// Compared against the saved content, not just "an edit happened" —
	// otherwise undoing back to the last save never clears the indicator.
	const isDirty = !contentMatches(newState, doc.savedContent);
	documents.set(docId, { ...doc, editorState: newState, isDirty });
	// An edit promotes a preview tab (F2.1) regardless of where it lands —
	// undoing back to clean doesn't un-promote an already-permanent tab.
	promoteDocumentTabs(docId);
}

function syncEditorState(docId: string, newState: EditorState): void {
	const doc = documents.get(docId);
	if (doc) documents.set(docId, { ...doc, editorState: newState });
}

/** Reconfigures tab size / soft tabs / word wrap on every open document, not
 *  just the active one — same reasoning as saveDocument's Save-As
 *  language-compartment fix: a document that isn't the focused tab still
 *  needs its stored EditorState updated so it reflects current settings the
 *  next time it's focused, not just whatever was current when it was
 *  created. The active document's live view is also dispatched to directly,
 *  wrapped in untrack(): the update listener's read-then-write of
 *  `documents` happens synchronously inside that dispatch, and without
 *  untrack() a caller that's itself a settings-watching $effect would loop
 *  the same way the Find bar's search-sync effect did (see its own comment). */
export function applyEditorSettingsToAllDocuments(settings: Settings): void {
	const content = computeEditorSettingsExtensions(settings);
	// The whole body, not just the dispatch: iterating `documents` below (to
	// find every open document) is itself a tracked read on the SvelteMap,
	// and this function's own writes to it would then look, to whatever
	// effect called this, like "this effect reads and writes the same
	// state" — the exact loop shape the Find bar bug was. untrack() keeps
	// this entire read-then-write pass from ever being attributed to a
	// caller's reactive scope.
	untrack(() => {
		const view = getActiveView();
		const activeDocId = getActiveDocument()?.id;

		for (const [docId, doc] of documents) {
			const reconfigure = doc.editorState.update({ effects: editorSettingsCompartment.reconfigure(content) });
			documents.set(docId, { ...doc, editorState: reconfigure.state });

			if (view && docId === activeDocId && view.state === doc.editorState) {
				view.dispatch(reconfigure);
			}
		}
	});
}

function createDocumentState(docId: string, contents: string, path: string | null): EditorState {
	return EditorState.create({
		doc: contents,
		extensions: [
			...baseExtensions(),
			languageCompartment.of(getLanguageSupport(path)),
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
		editorState: createDocumentState(docId, contents, path),
		isDirty: false,
		language: detectLanguage(path),
		lineEnding,
		savedContent: contents
	};
	documents.set(docId, document);
	// Fire-and-forget: the watch only needs to be *up* before the next
	// external change, not before this function returns (§F2).
	if (path) watchFileQuietly(path);

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
	let path = doc.path;
	let language = doc.language;
	// Built off doc.editorState directly (not the active view) throughout,
	// and each step below re-checks view.state against the *current* value
	// of this variable — not doc.editorState — so this still applies
	// correctly when saving a document that isn't the focused tab (e.g.
	// saveAllDirtyDocuments() iterating tabs without switching them), and so
	// a later step's dispatch doesn't get compared against an already-stale
	// pre-transformation state.
	let editorState = doc.editorState;

	const settings = getSettings();
	const original = editorState.doc.toString();
	let contents = original;
	if (settings.trimTrailingWhitespaceOnSave) contents = trimTrailingWhitespace(contents);
	if (settings.ensureNewlineAtEofOnSave) contents = ensureTrailingNewline(contents);

	// Applied to the buffer itself, not just the bytes about to be written —
	// otherwise the editor's content and the file on disk diverge the moment
	// save finishes, and the dirty indicator would immediately relight
	// (contentMatches compares the live doc against savedContent, which has
	// to equal what's actually in editorState).
	if (contents !== original) {
		const replace = editorState.update({ changes: { from: 0, to: editorState.doc.length, insert: contents } });
		const view = getActiveView();
		if (view && view.state === editorState) view.dispatch(replace);
		editorState = replace.state;
	}

	if (!path || options.forcePrompt) {
		const chosen = await saveAsDialog();
		if (!chosen) return false;
		const pathChanged = path !== chosen;
		path = chosen;
		language = detectLanguage(path);

		// An untitled buffer (or one saved under a different extension) gets
		// re-languaged in place — reconfiguring the compartment rather than
		// rebuilding the whole state, since it's still the same document.
		if (pathChanged) {
			const reconfigure = editorState.update({
				effects: languageCompartment.reconfigure(getLanguageSupport(path))
			});
			const view = getActiveView();
			if (view && view.state === editorState) view.dispatch(reconfigure);
			editorState = reconfigure.state;

			// §F2's external-change watch follows the path, not the document —
			// an untitled buffer has nothing to watch until it has one.
			if (doc.path) unwatchFileQuietly(doc.path);
			watchFileQuietly(path);
		}
	}

	await writeFile(path, contents, doc.lineEnding);
	documents.set(doc.id, { ...doc, path, language, editorState, isDirty: false, savedContent: contents });
	promoteDocumentTabs(doc.id);
	return true;
}

/** Removes a tab (and its document, if nothing else references it) with no
 *  dirty check and no history entry — used internally when a preview tab is
 *  replaced by a new one, which is not a user-visible "close". */
function closeTabSilently(pane: Pane, tab: Tab): void {
	pane.tabs = pane.tabs.filter((t) => t.id !== tab.id);
	if (!pane.tabs.some((t) => t.docId === tab.docId)) {
		const path = documents.get(tab.docId)?.path;
		if (path) unwatchFileQuietly(path);
		documents.delete(tab.docId);
	}
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

/** §F2: a file changing on disk reloads its open document silently if the
 *  tab is clean, or shows a non-blocking notice (leaving the buffer alone)
 *  if it's dirty. A plain async event-listener callback, not a Svelte
 *  effect, so — unlike applyEditorSettingsToAllDocuments — dispatching to
 *  the live view here doesn't need untrack(): nothing is tracking this
 *  callback's reads. */
async function handleExternalFileChange(path: string): Promise<void> {
	for (const [docId, doc] of documents) {
		if (doc.path !== path) continue;

		if (doc.isDirty) {
			showToast(`${path.split('/').pop()} changed on disk — showing your unsaved version.`, 'info');
			continue;
		}

		let read: { contents: string; lineEnding: LineEnding };
		try {
			read = await readFile(path);
		} catch (err) {
			showToast(`Couldn't reload ${path.split('/').pop()}: ${err}`, 'error');
			continue;
		}

		// Skip a no-op reload (e.g. this "change" was actually our own save
		// landing) — replacing identical content would still create a new
		// transaction and needlessly disturb undo history/decorations.
		if (read.contents === doc.editorState.doc.toString()) continue;

		const replace = doc.editorState.update({
			changes: { from: 0, to: doc.editorState.doc.length, insert: read.contents }
		});
		const view = getActiveView();
		if (view && view.state === doc.editorState) view.dispatch(replace);

		documents.set(docId, {
			...doc,
			editorState: replace.state,
			lineEnding: read.lineEnding,
			savedContent: read.contents
		});
	}
}

let unlistenFileChanged: (() => void) | null = null;

export async function initExternalFileWatch(): Promise<void> {
	unlistenFileChanged = await listen<string>('workspace://file-changed', (event) => {
		handleExternalFileChange(event.payload);
	});
}

export function teardownExternalFileWatch(): void {
	unlistenFileChanged?.();
	unlistenFileChanged = null;
}
