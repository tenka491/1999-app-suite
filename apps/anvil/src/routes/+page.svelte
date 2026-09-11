<script lang="ts">
	import type { EditorView } from '@codemirror/view';
	import EditorHost from '$lib/editor/EditorHost.svelte';
	import { openFileDialog, writeFile, saveFileAsDialog } from '$lib/workspace/file-io';

	let view = $state<EditorView | null>(null);
	let currentPath = $state<string | null>(null);
	let initialDoc = $state('');
	let isBusy = $state(false);
	let errorMessage = $state<string | null>(null);

	// Inline message as a stopgap — the real Toast component lands with the
	// rest of the workspace UI in M2.
	async function handleOpen() {
		if (isBusy) return;
		isBusy = true;
		errorMessage = null;
		try {
			const result = await openFileDialog();
			if (!result) return;
			currentPath = result.path;
			initialDoc = result.contents;
		} catch (err) {
			errorMessage = `Couldn't open file: ${err}`;
		} finally {
			isBusy = false;
		}
	}

	async function handleSave() {
		if (isBusy || !view) return;
		isBusy = true;
		errorMessage = null;
		try {
			const contents = view.state.doc.toString();
			if (currentPath) {
				await writeFile(currentPath, contents);
			} else {
				currentPath = await saveFileAsDialog(contents);
			}
		} catch (err) {
			errorMessage = `Couldn't save file: ${err}`;
		} finally {
			isBusy = false;
		}
	}
</script>

<div class="app">
	<header class="toolbar">
		<button onclick={handleOpen} disabled={isBusy}>Open</button>
		<button onclick={handleSave} disabled={isBusy}>Save</button>
		{#if errorMessage}
			<span class="error">{errorMessage}</span>
		{/if}
		<span class="path">{currentPath ?? 'Untitled'}</span>
	</header>
	<main class="editor">
		<EditorHost doc={initialDoc} bind:view />
	</main>
</div>

<style lang="scss">
	.app {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		background: var(--color-bg-elevated);
	}
	.error {
		color: var(--color-danger);
		font-size: 12px;
	}
	.path {
		color: var(--color-fg-muted);
		font-size: 12px;
		margin-left: auto;
	}
	.editor {
		flex: 1;
		min-height: 0;
	}
</style>
