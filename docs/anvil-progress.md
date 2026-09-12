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

## M1 — The spine (done)

**What was built**

- Command registry (`register`/`unregisterBySource`/`run`/`list`), mutable at runtime,
  source-tagged. `run()` is the single choke point every command execution passes
  through — it builds the `CommandContext`, guards against a command re-entering while
  already running, records recency for the palette, and turns a thrown error into a
  toast instead of an unhandled rejection.
- A pure, DOM-free keymap system: normalization (`mod`/`ctrl`/`alt`/`shift`/`super` +
  aliases, punctuation matched on `event.code`, letters on `event.key`), chord
  tracking, platform filtering, default-then-user merge with `null`-unbind — all
  covered by 31 Vitest tests (`keys.test.ts`, `resolver.test.ts`, `parse.test.ts`).
- Default keymap (bundled, sparse — only binds commands that exist) + user keymap at
  `<app_config_dir>/keymap.jsonc`, created on first run, hot-reloaded via a Rust
  file-system watcher, with parse errors surfaced as a toast that keeps the previous
  keymap.
- Command palette (`mod+shift+p`): fuzzy search, live keybindings, recently-used-first.
- `file.open`/`file.save`/`file.save_as`/`edit.undo`/`edit.redo`/`palette.show`
  registered as commands; the M0 toolbar now calls `run("file.open")` etc. instead of
  importing file-io functions directly.
- The invariant #4 accessor (`getActiveView()`/`setActiveView()`) now exists, backing
  `CommandContext`, even though it's still just one view under the hood.

**Key modules**

| Path | Purpose |
|---|---|
| `apps/anvil/src/lib/commands/registry.svelte.ts` | The registry: register/run/list, running-guard, recency, toast-on-error |
| `apps/anvil/src/lib/commands/core/` | `file.ts`, `edit.ts`, `palette.ts` — the M1 command set |
| `apps/anvil/src/lib/keymap/keys.ts` | Keystroke normalization + event↔config token matching |
| `apps/anvil/src/lib/keymap/resolver.ts` | `mergeKeymaps()`, the pure chord resolver |
| `apps/anvil/src/lib/keymap/parse.ts` | JSONC parsing (via `jsonc-parser`) with line/column errors |
| `apps/anvil/src/lib/keymap/keymap-store.svelte.ts` | Ties defaults + user keymap + hot reload + resolver together |
| `apps/anvil/src/lib/keymap/default-keymap.jsonc` | Bundled defaults |
| `apps/anvil/src/lib/ui/Palette.svelte`, `Toast.svelte` | Command palette and the toast stopgap |
| `apps/anvil/src/lib/workspace/active-view.svelte.ts` | The invariant #4 accessor |
| `apps/anvil/src-tauri/src/config.rs` | User keymap file: first-run creation, directory watch, debounce |

**Deviations from the PRD, and why**

- **`CommandContext` is just `{ view }`** for now, not the fuller `{ view, doc, pane,
  workspace }` shape from §4.1a — that's real M2 work (the document/pane/tab model).
  Expanding it early would mean building M2 prematurely.
- **The default keymap only binds commands that exist yet**: `palette.show`,
  `file.save`, `file.save_as`, `edit.undo`, `edit.redo`. `file.open` is registered with
  no default binding, matching the PRD's own table (which omits one). The rest of
  §6's bindings arrive as each milestone builds the command they're for.
- **CodeMirror's built-in keymap is now just `standardKeymap`** (cursor movement, basic
  text entry), not `defaultKeymap` (which bundles in `historyKeymap`). Undo/redo are
  `edit.undo`/`edit.redo` commands dispatched through the JSON keymap now, so they're
  rebindable; `history()` stays as the state extension those commands operate on.
- **`preferences.open_keymap`/`open_default_keymap` are not implemented.** The PRD
  says these open the keymap "in an editor tab" — that requires the tab/document model,
  which doesn't exist until M2. Deferred rather than half-built (e.g. opening in an OS
  text editor, which isn't what the spec asks for).
- **New dependencies**: `jsonc-parser` (frontend) — parsing Sublime-style JSONC
  correctly (comments/trailing commas, without breaking on either inside strings) isn't
  worth hand-rolling. On the Rust side, `notify` (already named in the PRD's suggested
  crates) for the keymap file watch; `notify-debouncer-mini` was added and then
  **removed** — see the bug note below.
- **Platform detection is `navigator.platform` sniffing**, not `@tauri-apps/plugin-os`.
  Good enough for the two supported v1 platforms and avoids a whole plugin + Rust
  crate + capability just to pick ctrl vs. cmd.

**Bugs hit and fixed during this milestone** (worth knowing if you touch this code):

- **Svelte reactivity loop**: `keymap-store.svelte.ts`'s `rebuild()` originally wrote
  `resolvedEntries` (a `$state`) and then immediately read it back in the same
  function to build the resolver. Reading a `$state` you just wrote inside the same
  effect pass is exactly what trips Svelte's "effect reads and writes the same state"
  loop guard. Fixed by building from a local variable and assigning to `$state` only
  once, without reading it back.
- **Listener leak across page reloads**: `initKeymap()` called `listen("keymap://changed", ...)`
  without ever storing/calling the returned unlisten function. Across dev-mode page
  reloads this stacked up duplicate listeners that each independently fired. Fixed by
  storing the unlisten handle and tearing down the previous one before registering a
  new one (`initKeymap` is now safe to call more than once).
- **Read→event→read feedback loop (the big one)**: `notify-debouncer-mini` doesn't
  filter by event kind at all — it treats *any* touch to the watched path, including a
  plain read, as "changed." Since the frontend reads the keymap file via `invoke()`
  every time it loads it, and that read fires a Linux `Access` inotify event, the
  watcher kept re-emitting `keymap://changed` in response to its own reads, forever
  (visible as a new toast roughly every 300ms — the debounce window). Fixed by
  dropping `notify-debouncer-mini` and using `notify::recommended_watcher` directly
  with an explicit filter (`Create`/`Modify`/`Remove` only, `Access` excluded) plus a
  hand-rolled epoch-based debounce via `tauri::async_runtime::spawn_blocking`.
- **Watching the file path directly, not its parent directory**: a watch placed on the
  exact file path can silently go dead across an atomic write (temp file + rename),
  since the rename replaces the inode at that path. Watching the parent directory and
  filtering events by filename survives that — relevant for any tool (editors
  included) that saves this way, not just this bug.
- **Palette showed only one keybinding per command** (`Array.find` instead of
  `Array.filter`) even though a command can have more than one binding (e.g. defaults
  plus a platform-specific extra like `edit.redo`'s Linux `ctrl+y`). Fixed to join all
  matching bindings, matching the PRD's "keybinding(s)" (plural).
- **Watcher-start failure was silent** (code review catch): if `watch_user_keymap`
  fails to start (e.g. an unwritable config dir), the old code only logged the error —
  the user lost hot-reload with no indication, unlike a parse error which does show a
  toast. Fixed by emitting a `keymap://watch-failed` event the frontend turns into a
  toast, same as any other keymap problem.
