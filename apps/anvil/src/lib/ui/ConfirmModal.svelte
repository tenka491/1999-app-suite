<script lang="ts">
	import { getConfirmRequest } from './confirm.svelte';

	const request = $derived(getConfirmRequest());
</script>

{#if request}
	<div class="overlay">
		<div class="modal">
			<p>{request.message}</p>
			<div class="actions">
				<button onclick={() => request.resolve('cancel')}>Cancel</button>
				<button onclick={() => request.resolve('discard')}>Don't Save</button>
				<button class="primary" onclick={() => request.resolve('save')}>Save</button>
			</div>
		</div>
	</div>
{/if}

<style lang="scss">
	.overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.5);
		z-index: 300;
	}
	.modal {
		width: min(400px, 90vw);
		padding: var(--space-3);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
	}
	p {
		margin-bottom: var(--space-3);
		color: var(--color-fg);
		font-size: 14px;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
	}
	button {
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-fg);
		font-size: 13px;

		&.primary {
			background: var(--color-accent);
			border-color: var(--color-accent);
			color: var(--color-bg);
		}
	}
</style>
