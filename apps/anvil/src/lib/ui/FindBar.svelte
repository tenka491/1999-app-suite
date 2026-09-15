<script lang="ts">
	import { untrack } from 'svelte';
	import {
		SearchQuery,
		setSearchQuery,
		getSearchQuery,
		findNext,
		findPrevious,
		replaceNext,
		replaceAll
	} from '@codemirror/search';
	import { isFindBarOpen, isFindBarShowingReplace, closeFindBar } from './find-bar-state.svelte';
	import { getActiveView } from '../workspace/active-view.svelte';
	import { getCursorInfo } from '../editor/cursor-state.svelte';

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
	//
	// The dispatch is wrapped in untrack(): workspace-state.svelte.ts's update
	// listener does a read-then-write on the shared `documents` SvelteMap
	// (syncEditorState persists the post-dispatch state so it survives tab
	// switches) as a *synchronous* side effect of this exact dispatch call.
	// Without untrack(), Svelte attributes that read+write to this effect
	// itself (it's all still on the same call stack), sees its own dependency
	// change, and reruns — an infinite effect_update_depth_exceeded loop on
	// every keystroke. untrack() stops Svelte from tracking what happens
	// inside the dispatch, which is exactly what's needed here: this effect
	// should re-run when searchText/etc. change, not when something three
	// layers down the dispatch happens to touch.
	$effect(() => {
		const query = currentQuery();
		const view = getActiveView();
		if (view) untrack(() => view.dispatch({ effects: setSearchQuery.of(query) }));
	});

	$effect(() => {
		if (isFindBarOpen()) {
			searchText = '';
			replaceText = '';
			queueMicrotask(() => searchInputEl?.focus());
		}
	});

	const matchInfo = $derived.by(() => {
		// CodeMirror mutates view.state in place on every edit, which Svelte
		// can't see — reading this reactive signal (bumped by the same
		// updateListener on every docChanged/selectionSet) is what forces a
		// recompute while the user types with Find still open.
		getCursorInfo();
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

	// Guarded on query validity for the same reason find.next/find.prev are
	// (see commands/core/find.ts): findNext/findPrevious/replaceNext/replaceAll
	// fall back to CodeMirror's own native search panel — a second find UI we
	// never want — whenever the query is invalid, which an empty box always is.
	// Reads the view's own search state (same source find.ts's guards use)
	// rather than this component's local currentQuery(), which is only
	// guaranteed in sync with the view once the untrack()-wrapped effect
	// above has flushed.
	function doFindNext(): void {
		const view = getActiveView();
		if (view && getSearchQuery(view.state).valid) findNext(view);
	}

	function doFindPrev(): void {
		const view = getActiveView();
		if (view && getSearchQuery(view.state).valid) findPrevious(view);
	}

	function doReplaceNext(): void {
		const view = getActiveView();
		if (view && getSearchQuery(view.state).valid) replaceNext(view);
	}

	function doReplaceAll(): void {
		const view = getActiveView();
		if (view && getSearchQuery(view.state).valid) replaceAll(view);
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
