<script lang="ts">
	import { getToasts, dismissToast } from './toast.svelte';

	const toasts = $derived(getToasts());
</script>

{#if toasts.length > 0}
	<div class="toast-stack">
		{#each toasts as toast (toast.id)}
			<div class="toast toast--{toast.level}" role="alert">
				<span>{toast.text}</span>
				<button onclick={() => dismissToast(toast.id)} aria-label="Dismiss">×</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-stack {
		position: fixed;
		bottom: var(--space-3);
		right: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		z-index: 100;
	}
	.toast {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) var(--space-2);
		border-radius: 4px;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		color: var(--color-fg);
		font-size: 13px;
		max-width: 360px;
	}
	.toast--error {
		border-color: var(--color-danger);
	}
	.toast button {
		color: var(--color-fg-muted);
		font-size: 14px;
		line-height: 1;
	}
</style>
