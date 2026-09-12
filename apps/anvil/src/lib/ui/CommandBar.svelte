<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		onDismiss,
		inputEl = $bindable(),
		value = $bindable(''),
		placeholder,
		type = 'text',
		onKeydown,
		results
	}: {
		open: boolean;
		onDismiss: () => void;
		inputEl?: HTMLInputElement;
		value: string;
		placeholder: string;
		type?: 'text' | 'number';
		onKeydown: (event: KeyboardEvent) => void;
		/** Omit for a bare input (Goto Line); provide for a dropdown below it
		 *  (the palette, Goto Anything). */
		results?: Snippet;
	} = $props();
</script>

{#if open}
	<div class="scrim" onclick={onDismiss} role="presentation">
		<div class="bar" class:has-results={!!results} onclick={(event) => event.stopPropagation()} role="presentation">
			<input bind:this={inputEl} bind:value {placeholder} {type} onkeydown={onKeydown} />
			{#if results}
				<div class="results">{@render results()}</div>
			{/if}
		</div>
	</div>
{/if}

<style lang="scss">
	.scrim {
		position: fixed;
		inset: 0;
		display: flex;
		justify-content: center;
		padding-top: 64px;
		z-index: 200;
	}
	.bar {
		width: min(560px, 90vw);
		max-height: 50vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);

		&.has-results input {
			border-bottom: 1px solid var(--color-border);
		}
		// No dropdown below it (Goto Line) — a bare input doesn't need the
		// same width as one with a results list under it.
		&:not(.has-results) {
			width: min(320px, 90vw);
		}
	}
	input {
		padding: var(--space-2) var(--space-3);
		border: none;
		background: transparent;
		color: var(--color-fg);
		font: inherit;
		font-size: 14px;

		&:focus {
			outline: none;
			box-shadow: inset 0 0 0 1px var(--color-accent);
		}
	}
</style>
