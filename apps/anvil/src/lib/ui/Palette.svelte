<script lang="ts">
	import { isPaletteOpen, closePalette } from './palette-state.svelte';
	import { listCommands, run, getRecentCommandIds } from '../commands/registry.svelte';
	import { getKeybindingLabel } from '../keymap/keymap-store.svelte';
	import { fuzzyScore } from './fuzzy';
	import type { Command } from '../commands/types';

	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	const results = $derived.by(() => {
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
		results;
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
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			const command = results[selectedIndex];
			if (command) selectAndRun(command);
		}
	}
</script>

{#if isPaletteOpen()}
	<div class="overlay" onclick={closePalette} role="presentation">
		<div class="palette" onclick={(event) => event.stopPropagation()} role="presentation">
			<input
				bind:this={inputEl}
				bind:value={query}
				onkeydown={onKeydown}
				placeholder="Type a command…"
				aria-label="Command palette"
			/>
			<ul>
				{#each results as command, index (command.id)}
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
		</div>
	</div>
{/if}

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		display: flex;
		justify-content: center;
		padding-top: 15vh;
		background: rgba(0, 0, 0, 0.4);
		z-index: 200;
	}
	.palette {
		width: min(560px, 90vw);
		max-height: 60vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
	}
	input {
		padding: var(--space-2);
		border: none;
		border-bottom: 1px solid var(--color-border);
		background: transparent;
		color: var(--color-fg);
		font: inherit;
		font-size: 15px;

		&:focus {
			outline: none;
		}
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
