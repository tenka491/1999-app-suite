<script lang="ts">
	import '../styles/app.scss';
	import favicon from '$lib/assets/favicon.png';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { registerCoreCommands } from '$lib/commands/core';
	import { initKeymap, teardownKeymap, handleGlobalKeydown } from '$lib/keymap/keymap-store.svelte';
	import {
		hasAnyDirtyDocuments,
		saveAllDirtyDocuments,
		applyEditorSettingsToAllDocuments,
		initExternalFileWatch,
		teardownExternalFileWatch
	} from '$lib/workspace/workspace-state.svelte';
	import { initFolderWatch, teardownFolderWatch } from '$lib/workspace/folder-tree.svelte';
	import { initSettings, teardownSettings, getSettings } from '$lib/settings/settings-store.svelte';
	import { resolveDataTheme } from '$lib/settings/themes';
	import { initFontSize, getFontSize } from '$lib/editor/font-size-state.svelte';
	import { getActiveView } from '$lib/workspace/active-view.svelte';
	import { askUnsavedChanges } from '$lib/ui/confirm.svelte';
	import Toast from '$lib/ui/Toast.svelte';
	import Palette from '$lib/ui/Palette.svelte';
	import ConfirmModal from '$lib/ui/ConfirmModal.svelte';
	import GotoAnything from '$lib/ui/GotoAnything.svelte';
	import GotoLine from '$lib/ui/GotoLine.svelte';
	import FindBar from '$lib/ui/FindBar.svelte';
	import ThemeSwitch from '$lib/ui/ThemeSwitch.svelte';

	let { children } = $props();

	registerCoreCommands();

	$effect(() => {
		initKeymap();
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => {
			window.removeEventListener('keydown', handleGlobalKeydown);
			teardownKeymap();
		};
	});

	$effect(() => {
		initFolderWatch();
		return () => teardownFolderWatch();
	});

	$effect(() => {
		initExternalFileWatch();
		return () => teardownExternalFileWatch();
	});

	$effect(() => {
		// Seeds the session font size from the real loaded settings once —
		// see font-size-state.svelte.ts for why this doesn't belong inside
		// settings-store.svelte.ts itself (font size is session-only and
		// shouldn't re-seed on every later settings change).
		initSettings().then(() => initFontSize());
		return () => teardownSettings();
	});

	$effect(() => {
		document.documentElement.dataset.theme = resolveDataTheme(getSettings().theme);
	});

	$effect(() => {
		document.documentElement.style.setProperty('--font-size-editor', `${getFontSize()}px`);
		// CodeMirror caches gutter/line measurements and only recomputes them
		// on its own detected changes (content, viewport, a dispatch) — an
		// external CSS var change it didn't dispatch leaves line numbers
		// measured for the old font size, visibly out of step with the
		// content. requestMeasure() forces a remeasure pass; it's a schedule
		// call, not a dispatch, so no untrack() concern here.
		getActiveView()?.requestMeasure();
	});

	$effect(() => {
		applyEditorSettingsToAllDocuments(getSettings());
	});

	$effect(() => {
		const win = getCurrentWindow();
		const unlistenPromise = win.onCloseRequested(async (event) => {
			if (!hasAnyDirtyDocuments()) return;
			event.preventDefault();

			const choice = await askUnsavedChanges('You have unsaved changes. Save before quitting?');
			if (choice === 'cancel') return;
			if (choice === 'save' && !(await saveAllDirtyDocuments())) return; // a save was cancelled

			await win.destroy();
		});
		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<Palette />
<GotoAnything />
<GotoLine />
<FindBar />
<ThemeSwitch />
<Toast />
<ConfirmModal />
