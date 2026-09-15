<script lang="ts">
	import { isThemeSwitchOpen, closeThemeSwitch } from './theme-switch-state.svelte';
	import { THEMES, type ThemeOption } from '../settings/themes';
	import { getSettings, updateSetting } from '../settings/settings-store.svelte';
	import { fuzzyScore } from './fuzzy';
	import CommandBar from './CommandBar.svelte';

	let query = $state('');
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	const matchingThemes = $derived.by(() => {
		return THEMES.map((theme) => ({ theme, score: fuzzyScore(query, theme.name) }))
			.filter((entry): entry is { theme: ThemeOption; score: number } => entry.score !== null)
			.sort((a, b) => b.score - a.score)
			.map((entry) => entry.theme);
	});

	$effect(() => {
		matchingThemes;
		selectedIndex = 0;
	});

	$effect(() => {
		if (isThemeSwitchOpen()) {
			query = '';
			selectedIndex = 0;
			queueMicrotask(() => inputEl?.focus());
		}
	});

	function selectTheme(theme: ThemeOption): void {
		closeThemeSwitch();
		updateSetting('theme', theme.id);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			closeThemeSwitch();
		} else if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			selectedIndex = Math.min(selectedIndex + 1, matchingThemes.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			const theme = matchingThemes[selectedIndex];
			if (theme) selectTheme(theme);
		}
	}
</script>

<CommandBar
	open={isThemeSwitchOpen()}
	onDismiss={closeThemeSwitch}
	bind:inputEl
	bind:value={query}
	placeholder="Select a theme…"
	{onKeydown}
>
	{#snippet results()}
		<ul>
			{#each matchingThemes as theme, index (theme.id)}
				<li class:selected={index === selectedIndex}>
					<button onclick={() => selectTheme(theme)}>
						<span class="title">{theme.name}</span>
						{#if getSettings().theme === theme.id}
							<span class="current">Current</span>
						{/if}
					</button>
				</li>
			{:else}
				<li class="empty">No matching themes</li>
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
	.current {
		color: var(--color-fg-muted);
		font-size: 12px;
	}
</style>
