<script lang="ts">
	import { isGotoLineOpen, closeGotoLine } from './goto-line-state.svelte';
	import { getActiveView } from '../workspace/active-view.svelte';
	import { jumpToLine } from '../editor/goto-line';
	import CommandBar from './CommandBar.svelte';

	let value = $state('');
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		if (isGotoLineOpen()) {
			value = '';
			queueMicrotask(() => inputEl?.focus());
		}
	});

	function submit(): void {
		const line = parseInt(value, 10);
		const view = getActiveView();
		closeGotoLine();
		if (view && Number.isFinite(line)) jumpToLine(view, line);
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			closeGotoLine();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			submit();
		}
	}
</script>

<CommandBar
	open={isGotoLineOpen()}
	onDismiss={closeGotoLine}
	bind:inputEl
	bind:value
	placeholder="Go to line…"
	type="number"
	{onKeydown}
/>
