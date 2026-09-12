<script lang="ts">
	import EditorHost from '$lib/editor/EditorHost.svelte';
	import Tabs from '$lib/ui/Tabs.svelte';
	import Sidebar from '$lib/ui/Sidebar.svelte';
	import StatusBar from '$lib/ui/StatusBar.svelte';
	import { run, isRunning } from '$lib/commands/registry.svelte';
	import { getActiveDocument } from '$lib/workspace/workspace-state.svelte';
	import { isSidebarVisible } from '$lib/ui/sidebar-state.svelte';

	const activeDoc = $derived(getActiveDocument());
</script>

<div class="app">
	<header class="toolbar">
		<button onclick={() => run('sidebar.toggle')}>☰</button>
		<button onclick={() => run('file.new')} disabled={isRunning('file.new')}>New</button>
		<button onclick={() => run('file.open')} disabled={isRunning('file.open')}>Open</button>
		<button onclick={() => run('file.save')} disabled={isRunning('file.save')}>Save</button>
		<span class="path">{activeDoc?.path ?? 'Untitled'}</span>
	</header>
	<div class="body">
		{#if isSidebarVisible()}
			<aside class="sidebar-slot">
				<Sidebar />
			</aside>
		{/if}
		<div class="main">
			<Tabs />
			<main class="editor">
				<EditorHost />
			</main>
		</div>
	</div>
	<StatusBar />
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
	.body {
		flex: 1;
		display: flex;
		min-height: 0;
	}
	.sidebar-slot {
		width: 240px;
		flex-shrink: 0;
	}
	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.editor {
		flex: 1;
		min-height: 0;
	}
</style>
