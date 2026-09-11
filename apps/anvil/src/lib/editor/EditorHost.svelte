<script lang="ts">
	import type { EditorView } from '@codemirror/view';
	import { createEditorView } from './create-editor';

	let {
		doc = '',
		view = $bindable(null)
	}: { doc?: string; view?: EditorView | null } = $props();

	let container: HTMLDivElement;

	$effect(() => {
		const editorView = createEditorView(container, doc);
		view = editorView;
		return () => editorView.destroy();
	});
</script>

<div class="editor-host" bind:this={container}></div>

<style>
	.editor-host {
		height: 100%;
		overflow: auto;
	}
</style>
