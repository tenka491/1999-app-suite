<script lang="ts">
	import { createEditorView } from './create-editor';
	import { setActiveView } from '../workspace/active-view.svelte';

	let { doc = '' }: { doc?: string } = $props();

	let container: HTMLDivElement;

	$effect(() => {
		const editorView = createEditorView(container, doc);
		setActiveView(editorView);
		return () => {
			setActiveView(null);
			editorView.destroy();
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
