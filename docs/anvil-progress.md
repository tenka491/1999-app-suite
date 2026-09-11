# Anvil — Progress Log

## M0 — Scaffold (done)

**What was built**

- Yarn workspace root confirmed (`apps/*`, `packages/*`), Lerna removed, `yarn.lock` committed.
- `apps/anvil` scaffolded: SvelteKit (TypeScript, Svelte 5 runes forced on) via `sv create`,
  then Tauri 2 layered in with `cargo tauri init`. `@sveltejs/adapter-static` wired up.
- CodeMirror 6 mounted in a single view, with a minimal dark theme driven entirely by
  the CSS custom properties in `_tokens.scss` (no hardcoded colors in the editor theme).
- Open/save one file via the native dialog, backed by real Rust commands rather than
  the generic JS fs plugin.
- Sass structure (`_reset.scss`, `_tokens.scss`, `app.scss`) and Red Hat Mono bundled
  locally as vendored `.woff2` files (not an npm package, not a CDN).

**Key modules**

| Path | Purpose |
|---|---|
| `apps/anvil/src/lib/editor/create-editor.ts` | CodeMirror `EditorView` factory + theme |
| `apps/anvil/src/lib/editor/EditorHost.svelte` | Mounts/tears down the editor in a container div |
| `apps/anvil/src/lib/workspace/file-io.ts` | Open/save dialog + `invoke()` wrappers |
| `apps/anvil/src/routes/+page.svelte` | The one view: toolbar + editor |
| `apps/anvil/src/routes/+layout.ts` | `ssr = false`, `prerender = true` (required by adapter-static — no server exists) |
| `apps/anvil/src/styles/` | `_reset.scss`, `_tokens.scss` (dark theme tokens), `app.scss` (font-face + base) |
| `apps/anvil/static/fonts/` | Vendored Red Hat Mono `.woff2` (latin + latin-ext, normal 300–700) + `RedHatMono-OFL.txt` |
| `apps/anvil/src-tauri/src/fs.rs` | `read_file` / `write_file` Tauri commands (plain UTF-8) |
| `apps/anvil/src-tauri/src/lib.rs` | Registers the dialog + log plugins, wires `fs.rs` commands |
| `apps/anvil/src-tauri/capabilities/default.json` | Scoped to `core:default` + `dialog:allow-open`/`allow-save` only |

**Deviations from the PRD, and why**

- **Scaffolding tool**: the PRD suggests `npm create tauri-app@latest`, but its Svelte
  template is plain Vite+Svelte, not SvelteKit. Used the official SvelteKit CLI
  (`sv create`) instead, then added Tauri with `cargo tauri init`. Same end state
  (SvelteKit + Tauri 2 + Svelte 5), different scaffolding path.
- **File I/O is UTF-8 only for now** — no encoding detection or line-ending
  preservation yet, even though `fs.rs` is where the architecture doc says that logic
  belongs. Picked the simplest thing that proves the open/save path end-to-end;
  encoding/line-ending handling and binary/large-file detection are real work that
  fits naturally with M5's large-file/binary handling item.
- **Editor keymap is a placeholder**: `defaultKeymap` + `historyKeymap` from
  `@codemirror/commands`, just enough to type, move the cursor, and undo/redo. This
  is not the rebindable JSON keymap system — that's M1. Expect to rip this keymap
  wiring out when the command registry and keymap resolver land.
- **Tauri app identifier**: set to `io.github.tenka491.anvil` as a placeholder (no
  real domain owned). Change it in `tauri.conf.json` if you want something else —
  changing it later is fine pre-release but should be treated as stable once shipped.
- **Cargo crate is still named `app`/`app_lib`** (Tauri's default from `cargo tauri
  init`), not renamed to `anvil`. Purely cosmetic, no functional impact, left alone to
  avoid touching generated boilerplate for no reason.

**Environment note:** Tauri 2 on Linux needs a Rust toolchain and
`webkit2gtk4.1-devel` (+ friends) installed on the machine — see the commands in
this conversation if setting up a new dev machine.
