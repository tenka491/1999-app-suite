<script lang="ts">
	import { getRootPath, getChildren } from '../workspace/folder-tree.svelte';
	import { run } from '../commands/registry.svelte';
	import { getKeybindingLabel } from '../keymap/keymap-store.svelte';
	import TreeNode from './TreeNode.svelte';

	const rootPath = $derived(getRootPath());
	const rootName = $derived(rootPath?.split('/').filter(Boolean).pop() ?? '');
	const children = $derived(rootPath ? getChildren(rootPath) : undefined);
	const openFolderKeys = $derived(getKeybindingLabel('workspace.open_folder'));
	const gotoAnythingKeys = $derived(getKeybindingLabel('goto.anything'));
</script>

<div class="sidebar">
	{#if rootPath}
		<div class="root-name">{rootName}</div>
		<div class="tree">
			{#each children ?? [] as entry (entry.path)}
				<TreeNode {entry} />
			{/each}
		</div>
	{:else}
		<div class="empty">
			<p>No folder open.</p>
			<button onclick={() => run('workspace.open_folder')}>
				Open Folder{openFolderKeys ? ` (${openFolderKeys})` : ''}
			</button>
			{#if gotoAnythingKeys}
				<p class="hint">Or press {gotoAnythingKeys} to jump to a file.</p>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.sidebar {
		height: 100%;
		overflow-y: auto;
		background: var(--color-bg-elevated);
		border-right: 1px solid var(--color-border);
	}
	.root-name {
		padding: var(--space-2);
		color: var(--color-fg-muted);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.empty {
		padding: var(--space-3);
		color: var(--color-fg-muted);
		font-size: 13px;

		p {
			margin-bottom: var(--space-2);
		}

		button {
			border: 1px solid var(--color-border);
			border-radius: 4px;
			padding: var(--space-1) var(--space-2);
			color: var(--color-fg);
			font-size: 13px;
		}
	}
</style>
