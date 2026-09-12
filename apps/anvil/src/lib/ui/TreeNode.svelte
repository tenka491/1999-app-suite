<script lang="ts">
	import { isExpanded, getChildren, toggleExpand } from '../workspace/folder-tree.svelte';
	import { run } from '../commands/registry.svelte';
	import type { DirEntry } from '../workspace/file-io';
	import TreeNode from './TreeNode.svelte';

	let { entry, depth = 0 }: { entry: DirEntry; depth?: number } = $props();

	const expanded = $derived(entry.isDir && isExpanded(entry.path));
	const children = $derived(entry.isDir ? getChildren(entry.path) : undefined);

	// A native double-click fires click, click, then dblclick. Since the
	// preview open is async (it awaits a file read), the second click and
	// the dblclick could both land while the first was still in flight, and
	// run()'s single-command reentrancy guard silently dropped them.
	// Delaying the single click to wait out a possible double-click fixed
	// that but made every click feel laggy. Awaiting the in-flight preview
	// open before promoting is correct with no delay on the common case.
	let openingPath: Promise<void> | null = null;

	function handleClick(): void {
		if (entry.isDir) {
			toggleExpand(entry.path);
			return;
		}
		openingPath = run('workspace.open_path', { path: entry.path, preview: true });
	}

	async function handleDoubleClick(): Promise<void> {
		if (entry.isDir) return;
		if (openingPath) await openingPath;
		run('workspace.open_path', { path: entry.path, preview: false });
	}
</script>

<div class="node">
	<button
		class="row"
		style="padding-left: {depth * 14 + 8}px"
		onclick={handleClick}
		ondblclick={handleDoubleClick}
	>
		<span class="chevron" class:hidden={!entry.isDir} class:expanded>▶</span>
		<span class="name">{entry.name}</span>
	</button>
	{#if expanded && children}
		{#each children as child (child.path)}
			<TreeNode entry={child} depth={depth + 1} />
		{/each}
	{/if}
</div>

<style lang="scss">
	.row {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		width: 100%;
		padding-top: 3px;
		padding-bottom: 3px;
		padding-right: var(--space-2);
		color: var(--color-fg);
		font-size: 13px;
		text-align: left;

		&:hover {
			background: var(--color-selection);
		}
	}
	.chevron {
		display: inline-block;
		width: 10px;
		font-size: 9px;
		color: var(--color-fg-muted);
		transition: transform 0.1s ease;
		flex-shrink: 0;

		&.expanded {
			transform: rotate(90deg);
		}
		&.hidden {
			visibility: hidden;
		}
	}
	.name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
