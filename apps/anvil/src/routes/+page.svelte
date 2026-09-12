<script lang="ts">
	import EditorHost from '$lib/editor/EditorHost.svelte';
	import { run, isRunning } from '$lib/commands/registry.svelte';
	import { getCurrentFilePath } from '$lib/workspace/current-file.svelte';

	const currentPath = $derived(getCurrentFilePath());
</script>

<div class="app">
	<header class="toolbar">
		<button onclick={() => run('file.open')} disabled={isRunning('file.open')}>Open</button>
		<button onclick={() => run('file.save')} disabled={isRunning('file.save')}>Save</button>
		<span class="path">{currentPath ?? 'Untitled'}</span>
	</header>
	<main class="editor">
		<EditorHost />
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
