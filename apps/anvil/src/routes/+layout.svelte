<script lang="ts">
	import '../styles/app.scss';
	import favicon from '$lib/assets/favicon.svg';
	import { registerCoreCommands } from '$lib/commands/core';
	import { initKeymap, teardownKeymap, handleGlobalKeydown } from '$lib/keymap/keymap-store.svelte';
	import Toast from '$lib/ui/Toast.svelte';
	import Palette from '$lib/ui/Palette.svelte';

	let { children } = $props();

	registerCoreCommands();

	$effect(() => {
		initKeymap();
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => {
			window.removeEventListener('keydown', handleGlobalKeydown);
			teardownKeymap();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<Palette />
<Toast />
