<script lang="ts">
	import { getActiveDocument } from '../workspace/workspace-state.svelte';
	import { getCursorInfo } from '../editor/cursor-state.svelte';
	import { getPendingChordLabel } from '../keymap/keymap-store.svelte';

	const doc = $derived(getActiveDocument());
	const cursor = $derived(getCursorInfo());
	const pendingChord = $derived(getPendingChordLabel());
</script>

<div class="status-bar">
	<span class="segment">
		Ln {cursor.line}, Col {cursor.column}{#if cursor.selectionCount > 1}
			({cursor.selectionCount} selections){/if}
	</span>
	{#if pendingChord}
		<span class="segment pending">{pendingChord} …</span>
	{/if}
	<span class="spacer"></span>
	<span class="segment">{doc?.language ?? 'Plain Text'}</span>
	<!-- Hardcoded until settings.jsonc exists (M5) — not per-file detected. -->
	<span class="segment">Spaces: 2</span>
	<span class="segment">{doc?.lineEnding === 'crlf' ? 'CRLF' : 'LF'}</span>
</div>

<style lang="scss">
	.status-bar {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: 2px var(--space-2);
		background: var(--color-bg-elevated);
		border-top: 1px solid var(--color-border);
		color: var(--color-fg-muted);
		font-size: 11px;
	}
	.spacer {
		flex: 1;
	}
	.pending {
		color: var(--color-accent);
	}
</style>
