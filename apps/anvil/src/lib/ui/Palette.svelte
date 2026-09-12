<script lang="ts">
	import { isPaletteOpen, closePalette } from './palette-state.svelte';
	import { listCommands, run, getRecentCommandIds } from '../commands/registry.svelte';
	import { getKeybindingLabel } from '../keymap/keymap-store.svelte';
	import { fuzzyScore } from './fuzzy';
	import type { Command } from '../commands/types';
	import CommandBar from './CommandBar.svelte';

	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	const matchingCommands = $derived.by(() => {
		const recent = getRecentCommandIds();

		const scored = listCommands()
			.filter((command) => !command.hidden)
			.map((command) => ({ command, score: fuzzyScore(query, command.title) }))
			.filter((entry): entry is { command: Command; score: number } => entry.score !== null);

		scored.sort((a, b) => {
			if (query === '') {
				const recentIndex = (id: string) => {
					const i = recent.indexOf(id);
					return i === -1 ? Infinity : i;
				};
				const diff = recentIndex(a.command.id) - recentIndex(b.command.id);
				if (diff !== 0) return diff;
			}
			return b.score - a.score;
		});

		return scored.map((entry) => entry.command);
	});

	$effect(() => {
		matchingCommands;
		selectedIndex = 0;
	});

	$effect(() => {
		if (isPaletteOpen()) {
			query = '';
			selectedIndex = 0;
			queueMicrotask(() => inputEl?.focus());
		}
	});

	function selectAndRun(command: Command): void {
		closePalette();
		run(command.id);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			closePalette();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			selectedIndex = Math.min(selectedIndex + 1, matchingCommands.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			const command = matchingCommands[selectedIndex];
			if (command) selectAndRun(command);
		}
	}
</script>

<CommandBar
	open={isPaletteOpen()}
	onDismiss={closePalette}
	bind:inputEl
	bind:value={query}
	placeholder="Type a command…"
	{onKeydown}
>
	{#snippet results()}
		<ul>
			{#each matchingCommands as command, index (command.id)}
				<li class:selected={index === selectedIndex}>
					<button onclick={() => selectAndRun(command)}>
						<span class="title">{command.title}</span>
						{#if getKeybindingLabel(command.id)}
							<span class="keys">{getKeybindingLabel(command.id)}</span>
						{/if}
					</button>
				</li>
			{:else}
				<li class="empty">No matching commands</li>
			{/each}
		</ul>
	{/snippet}
</CommandBar>

<style lang="scss">
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
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		text-align: left;
		color: var(--color-fg);
		font-size: 13px;
	}
	li.selected button {
		background: var(--color-selection);
	}
	.keys {
		color: var(--color-fg-muted);
		font-size: 12px;
		white-space: nowrap;
	}
</style>
