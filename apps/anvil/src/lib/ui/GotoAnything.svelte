<script lang="ts">
	import { isGotoAnythingOpen, closeGotoAnything } from './goto-anything-state.svelte';
	import { getRootPath } from '../workspace/folder-tree.svelte';
	import { searchFiles, type SearchResult } from '../workspace/file-io';
	import { run } from '../commands/registry.svelte';
	import { jumpToLine } from '../editor/goto-line';
	import { getActiveView } from '../workspace/active-view.svelte';
	import { showToast } from './toast.svelte';
	import CommandBar from './CommandBar.svelte';

	let query = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	const rootPath = $derived(getRootPath());

	// A trailing ":42" jumps to that line after opening (PRD §F8 stretch goal).
	function parseQuery(raw: string): { search: string; line: number | null } {
		const match = raw.match(/^(.*):(\d+)$/);
		return match ? { search: match[1], line: parseInt(match[2], 10) } : { search: raw, line: null };
	}

	// A stale response landing after a newer one would show wrong results —
	// only the most recent request's response gets applied.
	let requestId = 0;
	$effect(() => {
		const { search } = parseQuery(query);
		const root = rootPath;
		if (!root) {
			searchResults = [];
			return;
		}
		const thisRequest = ++requestId;
		searchFiles(search)
			.then((found) => {
				if (thisRequest === requestId) searchResults = found;
			})
			.catch((err) => {
				if (thisRequest === requestId) searchResults = [];
				showToast(`Search failed: ${err}`, 'error');
			});
	});

	$effect(() => {
		searchResults;
		selectedIndex = 0;
	});

	$effect(() => {
		if (isGotoAnythingOpen()) {
			query = '';
			searchResults = [];
			selectedIndex = 0;
			queueMicrotask(() => inputEl?.focus());
		}
	});

	async function openResult(result: SearchResult): Promise<void> {
		const { line } = parseQuery(query);
		closeGotoAnything();
		await run('workspace.open_path', { path: result.path, preview: false });
		if (line !== null) {
			const view = getActiveView();
			if (view) jumpToLine(view, line);
		}
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			closeGotoAnything();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			const result = searchResults[selectedIndex];
			if (result) openResult(result);
		}
	}
</script>

<CommandBar
	open={isGotoAnythingOpen()}
	onDismiss={closeGotoAnything}
	bind:inputEl
	bind:value={query}
	placeholder="Go to file… (name:line)"
	{onKeydown}
>
	{#snippet results()}
		{#if !rootPath}
			<p class="hint">Open a folder to search its files.</p>
		{:else}
			<ul>
				{#each searchResults as result, index (result.path)}
					<li class:selected={index === selectedIndex}>
						<button onclick={() => openResult(result)}>
							<span class="name">{result.name}</span>
							<span class="path">{result.relativePath}</span>
						</button>
					</li>
				{:else}
					<li class="empty">No matching files</li>
				{/each}
			</ul>
		{/if}
	{/snippet}
</CommandBar>

<style lang="scss">
	.hint {
		padding: var(--space-2);
		color: var(--color-fg-muted);
		font-size: 13px;
	}
	ul {
		list-style: none;
		overflow-y: auto;
	}
	li.empty {
		padding: var(--space-2);
		color: var(--color-fg-muted);
		font-size: 13px;
	}
	li button {
		width: 100%;
		display: flex;
		align-items: baseline;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		text-align: left;
		color: var(--color-fg);
		font-size: 13px;
	}
	li.selected button {
		background: var(--color-selection);
	}
	.path {
		color: var(--color-fg-muted);
		font-size: 12px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
