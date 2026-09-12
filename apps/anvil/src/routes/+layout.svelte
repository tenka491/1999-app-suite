<script lang="ts">
	import '../styles/app.scss';
	import favicon from '$lib/assets/favicon.svg';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import { registerCoreCommands } from '$lib/commands/core';
	import { initKeymap, teardownKeymap, handleGlobalKeydown } from '$lib/keymap/keymap-store.svelte';
	import { hasAnyDirtyDocuments, saveAllDirtyDocuments } from '$lib/workspace/workspace-state.svelte';
	import { initFolderWatch, teardownFolderWatch } from '$lib/workspace/folder-tree.svelte';
	import { askUnsavedChanges } from '$lib/ui/confirm.svelte';
	import Toast from '$lib/ui/Toast.svelte';
	import Palette from '$lib/ui/Palette.svelte';
	import ConfirmModal from '$lib/ui/ConfirmModal.svelte';
	import GotoAnything from '$lib/ui/GotoAnything.svelte';
	import GotoLine from '$lib/ui/GotoLine.svelte';

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
<Toast />
<ConfirmModal />
