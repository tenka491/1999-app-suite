<script lang="ts">
	import {
		getActivePane,
		getDocument,
		focusTabById,
		promoteTabById,
		requestCloseTab
	} from '../workspace/workspace-state.svelte';

	const pane = $derived(getActivePane());
</script>

<div class="tabs" role="tablist">
	{#each pane.tabs as tab (tab.id)}
		{@const doc = getDocument(tab.docId)}
		<div class="tab" class:active={tab.id === pane.activeTabId} class:preview={tab.isPreview}>
			<button
				class="tab-label"
				role="tab"
				aria-selected={tab.id === pane.activeTabId}
				onclick={() => focusTabById(tab.id)}
				ondblclick={() => promoteTabById(tab.id)}
			>
				<span class="name">{doc?.path ? doc.path.split('/').pop() : 'Untitled'}</span>
			</button>
			<span class="indicator">
				{#if doc?.isDirty}<span class="dirty-dot">●</span>{/if}
				<button class="close" aria-label="Close tab" onclick={() => requestCloseTab(tab.id)}>×</button>
			</span>
		</div>
	{/each}
</div>

<style lang="scss">
	.tabs {
		display: flex;
		overflow-x: auto;
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border);
	}
	.tab {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		padding: var(--space-1) var(--space-2);
		border-right: 1px solid var(--color-border);
		white-space: nowrap;

		&.active {
			background: var(--color-bg);
		}
		&.preview .name {
			font-style: italic;
		}
	}
	.tab-label {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-fg);
		font-size: 13px;
	}
	// Fixed-size slot so the dot/close swap on hover doesn't shift layout.
	.indicator {
		position: relative;
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}
	.dirty-dot,
	.close {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.dirty-dot {
		color: var(--color-accent);
		font-size: 10px;
	}
	.close {
		display: none;
		color: var(--color-fg-muted);
		font-size: 14px;
		line-height: 1;
	}
	.tab:hover .dirty-dot {
		display: none;
	}
	.tab:hover .close {
		display: flex;
	}
</style>
