import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Without this, `<style lang="scss">` blocks in .svelte files are never
			// actually run through Sass — they silently pass through as plain CSS,
			// which happens to work for nesting (valid native CSS now) but breaks on
			// anything SCSS-only, like `//` comments.
			preprocess: vitePreprocess(),
			adapter: adapter(),
			// Works around a dev-server-only bug in this vite@8 / vite-plugin-svelte@7
			// pairing (pre-existing in this project, not something changed here):
			// the plugin's virtual-CSS-module cache (`meta.svelte.css` in Vite's
			// module graph) intermittently comes back empty for components that
			// were transformed and cached correctly moments earlier, and Vite falls
			// back to injecting the component's *raw source* as the "css" — visibly
			// broken styling. `emitCss: false` sidesteps the whole virtual-module
			// code path: styles get bundled into the component's JS and injected via
			// `style.textContent` at runtime instead of a separate CSS fetch.
			// Production builds were never affected (`yarn build` bundles CSS
			// through a different path) — this only matters for `tauri dev`.
			emitCss: false
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
