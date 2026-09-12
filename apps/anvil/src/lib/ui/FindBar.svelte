<script lang="ts">
	import {
		SearchQuery,
		setSearchQuery,
		findNext,
		findPrevious,
		replaceNext,
		replaceAll
	} from '@codemirror/search';
	import { isFindBarOpen, isFindBarShowingReplace, closeFindBar } from './find-bar-state.svelte';
	import { getActiveView } from '../workspace/active-view.svelte';

	let searchText = $state('');
	let replaceText = $state('');
	let caseSensitive = $state(false);
	let wholeWord = $state(false);
	let regexp = $state(false);
	let searchInputEl: HTMLInputElement | undefined = $state();

	function currentQuery(): SearchQuery {
		return new SearchQuery({
			search: searchText,
			caseSensitive,
			wholeWord,
			regexp,
			replace: replaceText
		});
	}

	// Keep CodeMirror's search state in sync with the bar's own inputs —
	// findNext/findPrevious/replaceNext/replaceAll all read from that state
	// rather than taking a query argument directly.
	$effect(() => {
		const query = currentQuery();
		const view = getActiveView();
		if (view) view.dispatch({ effects: setSearchQuery.of(query) });
	});

	$effect(() => {
		if (isFindBarOpen()) {
			searchText = '';
			replaceText = '';
			queueMicrotask(() => searchInputEl?.focus());
		}
	});

	const matchInfo = $derived.by(() => {
		const view = getActiveView();
		const query = currentQuery();
		if (!view || !searchText || !query.valid) return null;
		const cursor = query.getCursor(view.state);
		const mainFrom = view.state.selection.main.from;
		let total = 0;
		let current = 0;
		for (let result = cursor.next(); !result.done; result = cursor.next()) {
			total++;
			if (result.value.from <= mainFrom) current = total;
		}
		return { total, current };
	});

	function close(): void {
		closeFindBar();
		getActiveView()?.focus();
	}

	function doFindNext(): void {
		const view = getActiveView();
		if (view) findNext(view);
	}

	function doFindPrev(): void {
		const view = getActiveView();
		if (view) findPrevious(view);
	}

	function doReplaceNext(): void {
		const view = getActiveView();
		if (view) replaceNext(view);
	}

	function doReplaceAll(): void {
		const view = getActiveView();
		if (view) replaceAll(view);
	}

	function onKeydown(event: KeyboardEvent): void {
		// FindBar deliberately isn't part of isAnyModalOpen() (F3/mod+g etc.
		// should still work while it's open), so without stopPropagation the
		// global resolver would also see this Escape/Enter and additionally
		// run selection.collapse or whatever else happens to be bound to it.
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			close();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			if (event.shiftKey) doFindPrev();
			else doFindNext();
		}
	}
</script>

{#if isFindBarOpen()}
	<div class="find-bar">
		<div class="row">
			<input
				bind:this={searchInputEl}
				bind:value={searchText}
				onkeydown={onKeydown}
				placeholder="Find"
				aria-label="Find"
			/>
			{#if matchInfo}
				<span class="count">{matchInfo.total === 0 ? 'No results' : `${matchInfo.current}/${matchInfo.total}`}</span>
			{/if}
			<button
				class="toggle"
				class:active={caseSensitive}
				onclick={() => (caseSensitive = !caseSensitive)}
				title="Case sensitive"
			>
				Aa
			</button>
			<button class="toggle" class:active={wholeWord} onclick={() => (wholeWord = !wholeWord)} title="Whole word">
				“ ”
			</button>
			<button class="toggle" class:active={regexp} onclick={() => (regexp = !regexp)} title="Regular expression">
				.*
			</button>
			<button onclick={doFindPrev} aria-label="Previous match">↑</button>
			<button onclick={doFindNext} aria-label="Next match">↓</button>
			<button onclick={close} aria-label="Close">×</button>
		</div>
		{#if isFindBarShowingReplace()}
			<div class="row">
				<input bind:value={replaceText} onkeydown={onKeydown} placeholder="Replace" aria-label="Replace" />
				<button onclick={doReplaceNext}>Replace</button>
				<button onclick={doReplaceAll}>Replace All</button>
			</div>
		{/if}
	</div>
{/if}

<style lang="scss">
	.find-bar {
		position: fixed;
		top: 12px;
		right: 12px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: var(--space-1) var(--space-2);
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
		z-index: 150;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	input {
		width: 180px;
		padding: var(--space-1);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-bg);
		color: var(--color-fg);
		font: inherit;
		font-size: 13px;

		&:focus {
			outline: none;
			box-shadow: inset 0 0 0 1px var(--color-accent);
		}
	}
	.count {
		min-width: 60px;
		color: var(--color-fg-muted);
		font-size: 12px;
		white-space: nowrap;
	}
	button {
		padding: 2px 6px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		color: var(--color-fg-muted);
		font-size: 12px;
		line-height: 1.4;
	}
	.toggle.active {
		border-color: var(--color-accent);
		color: var(--color-accent);
	}
</style>
