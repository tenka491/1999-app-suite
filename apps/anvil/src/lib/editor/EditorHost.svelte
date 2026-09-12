<script lang="ts">
	import { mountEditorView } from './create-editor';
	import { setActiveView } from '../workspace/active-view.svelte';

	let container: HTMLDivElement;

	$effect(() => {
		const view = mountEditorView(container);
		setActiveView(view);
		return () => {
			setActiveView(null);
			view.destroy();
		};
	});
</script>

<div class="editor-host" bind:this={container}></div>

<style>
	.editor-host {
		height: 100%;
		overflow: auto;
	}
</style>
