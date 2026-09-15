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

## M2, check-in 1 — Document/pane/tab model, tabs, preview tabs (done)

**What was built**

- The real §4.1a state model: `documents` (keyed by id), `panes` (length 1, per the
  invariant), tabs referencing documents by id. `getActiveView()`/`getActiveDocument()`
  now resolve through it for real.
- A single, long-lived `EditorView` that gets `setState()`'d to the active document's
  `EditorState` on every tab switch, instead of destroying/recreating the view — each
  document's `EditorState` carries its own update listener that keeps it (and its
  dirty flag) in sync as the user types.
- Tabs UI: dirty indicator, preview tabs in italics, hover-to-reveal close button
  (VS Code-style — a mid-milestone request), double-click / edit / save / `tab.keep_open`
  promotion rules from F2.1.
- Close-dirty-tab and quit-with-dirty-tabs prompts: a small custom `ConfirmModal`
  (Save/Don't Save/Cancel), wired to Tauri's `onCloseRequested`.
- New commands: `file.new`, `tab.close`, `tab.next`/`tab.prev`, `tab.reopen_closed`,
  `tab.keep_open`, with default keybindings added for the ones the PRD's table gives one.
- `fs.rs` now detects and preserves line endings (CRLF normalized to LF for CodeMirror,
  restored on write) — feeds the `Document.lineEnding` field.
- Auto-focus into the editor on New/Open/tab-switch (a mid-milestone request — Sublime
  and every other editor does this, clear miss to not have it from the start).
- 10 new Vitest tests for the pure parts of `workspace-state.svelte.ts` (dedup-by-path,
  preview replacement, close/reopen, tab cycling, save-promotes-preview).

**Key modules**

| Path | Purpose |
|---|---|
| `apps/anvil/src/lib/workspace/types.ts` | `Document`/`Tab`/`Pane` (§4.1a) |
| `apps/anvil/src/lib/workspace/workspace-state.svelte.ts` | The state model + every open/close/focus/save action |
| `apps/anvil/src/lib/workspace/language.ts` | Extension → display-name lookup (not real CodeMirror language support) |
| `apps/anvil/src/lib/ui/Tabs.svelte`, `ConfirmModal.svelte` | Tab bar, the Save/Don't Save/Cancel modal |
| `apps/anvil/src/lib/editor/create-editor.ts` | Now exports `baseExtensions()` + `mountEditorView()` (no longer one-shot `createEditorView(doc)`) |

**Deviations, and why**

- **`CommandContext` still doesn't have `workspace`** — no folder-opening concept
  exists yet (that's check-in 2). It's `{ view, doc, pane }` for now.
- **Only path-based tab closes go into `tab.reopen_closed` history.** An untitled
  buffer closed without saving has nothing on disk to restore; Sublime-style
  in-memory buffer history for that case is more machinery than v1 needs.
- **Language detection is a plain extension→label lookup**, not real CodeMirror
  language integration — F4's actual syntax highlighting is M4.

**Bugs hit and fixed:**

- **Tauri's argument-name casing**: `write_file`'s Rust parameter `line_ending`
  is exposed to JS as `lineEnding` — Tauri auto-camelCases *command arguments*
  (inputs), but does **not** rename plain `Serialize` struct fields on *return
  values* the same way. Sending `{ line_ending: ... }` instead of `{ lineEnding: ... }`
  produced a "missing field" error on every save. Easy to get bitten by again if a
  future command takes a snake_case-named argument — the input/output asymmetry is
  the trap.
- **`$state(new Map())` doesn't deep-proxy its values** (confirmed straight from
  Svelte's own doc comment on `SvelteMap`: "values in a reactive map are not made
  deeply reactive"). Mutating `doc.path = x` after save updated the data but the UI
  never saw it — the tab title didn't change. Fixed by switching `documents` to a
  `SvelteMap` and changing every document update to `documents.set(id, {...doc,
  ...changes})` instead of in-place field mutation. Notably, this bug was invisible
  to the Vitest suite — the tests check the returned data, which was already correct;
  only a live render exposes a reactivity-propagation bug like this one.
- **`<style lang="scss">` in `.svelte` files was never actually preprocessed.**
  `vite.config.ts` had no `preprocess: vitePreprocess()` on the `sveltekit()` plugin,
  so component-level SCSS silently fell back to being parsed as plain CSS. This went
  unnoticed because CSS nesting (`&.active { ... }`) is valid native CSS today; it
  broke the moment real SCSS-only syntax (a `//` comment) showed up in `Tabs.svelte`,
  crashing the whole app with a blank window. Fixed by adding `vitePreprocess()`.
  Worth knowing: SCSS `@use`/`@include`/variables in a component `<style>` block were
  silently broken this whole time until this fix, in case any earlier component
  relied on something more than nesting.

## M2, check-in 2 — Sidebar, folder opening, status bar (done)

**What was built**

- `workspace.rs`: ignore-aware, lazy (one level at a time) directory listing via the
  `ignore` crate, always hiding `.git`/`node_modules`/`target`/`_build`/`deps`
  regardless of `.gitignore`.
- A shared `watch.rs` helper (extracted from the M1 keymap watcher, which already had
  the Access-event fix baked in) — directory watching now backs both the user keymap
  and the sidebar tree. Watches are scoped to **expanded** directories only, one
  watcher each, torn down on collapse.
- Sidebar UI: lazy tree (`Sidebar.svelte` + recursive `TreeNode.svelte`), empty state
  with an Open Folder button when no workspace is open, `workspace.open_folder` /
  `sidebar.toggle` commands with their PRD-specified chord bindings
  (`mod+k mod+o` / `mod+k mod+b`).
- Status bar: live line/column (tracked separately from the document model — CodeMirror's
  `setState()` doesn't fire the update listener, so tab switches update it explicitly),
  language and line-ending from the Document model, a pending-chord indicator from the
  keymap resolver. Indentation is a hardcoded `Spaces: 2` until settings exist (M5).
- Default window size bumped to 1200×800 with an explicit 800×500 minimum (was
  800×600 with no minimum at all) — a mid-milestone request once the sidebar made the
  old default feel cramped.

**Key modules**

| Path | Purpose |
|---|---|
| `apps/anvil/src-tauri/src/watch.rs` | Shared debounced directory watcher (Access-event-safe) |
| `apps/anvil/src-tauri/src/workspace.rs` | `list_directory`, per-directory watch/unwatch commands |
| `apps/anvil/src/lib/workspace/folder-tree.svelte.ts` | Sidebar tree state (root, expanded set, cached children) |
| `apps/anvil/src/lib/ui/Sidebar.svelte`, `TreeNode.svelte` | The tree UI |
| `apps/anvil/src/lib/ui/StatusBar.svelte` | Status bar |
| `apps/anvil/src/lib/editor/cursor-state.svelte.ts` | Line/column/selection-count, updated from the editor's update listener |
| `apps/anvil/src/lib/commands/core/workspace.ts` | `workspace.open_folder`, `workspace.open_path` (hidden), `sidebar.toggle` |

**Deviations, and why**

- **Tree watching is per-expanded-directory, not one recursive watch on the whole
  workspace root.** Cheaper, and matches the tree's own lazy-load behavior — a
  collapsed subtree the user never opened doesn't need a watcher either.
- **External-change reload for *open documents*** (F2: reload silently if clean, notice
  if dirty) **wasn't built.** It would reuse the same watcher infrastructure, but
  scoping this check-in to "browse and open files" felt like the right cut line;
  worth picking up alongside M3/M4 workspace polish rather than here.

**Bugs hit and fixed:**

- **Double-click-to-promote silently did nothing.** A native double-click fires
  `click`, `click`, then `dblclick`. Since `workspace.open_path` is async (it awaits a
  file read), the second click and the `dblclick` could both arrive while the first
  (preview) call was still in flight, and `run()`'s single-command reentrancy guard
  silently dropped both. First fix attempt (delay the single click ~220ms to wait out
  a possible double-click) worked but made every single click feel laggy — a
  mid-milestone report caught that regression immediately. Real fix: no delay on the
  single click; the double-click handler awaits that same in-flight promise before
  promoting, so it's correctly sequenced instead of racing.

## M3 — Goto Anything (done)

**What was built**

- `search.rs`: a file index built once per folder-open (`ignore`-crate walk, same
  hidden-name rules as the sidebar) and cached in Tauri-managed state, matched against
  per-keystroke with `nucleo-matcher`. Building the index once and only re-matching
  per keystroke (rather than walking the tree on every keystroke) is what keeps typing
  responsive on a large repo — matching the PRD's explicit "no visible lag on ~20k
  files" bar.
- Goto Anything (`mod+p`): fuzzy file search, Enter opens as a **permanent** tab (the
  documented F2.1 exception — preview is only for casual sidebar browsing), plus the
  `:42` stretch goal (a trailing `:42` jumps to that line on open).
- `goto.line` (`ctrl+g`): jump to a line in the current file.
- `CommandBar.svelte`: a shared top-anchored bar (Sublime/VS Code style) extracted
  for the palette, Goto Anything, and Goto Line — one visual language instead of three
  near-duplicate overlay implementations. Went through a couple of rounds of
  mid-milestone design feedback: dropped the heavy full-screen dark backdrop, moved
  the focus glow from the whole bar onto just the input, and made the bar narrower
  when it has no results dropdown under it (Goto Line).
- `isAnyModalOpen()` (`ui/modal-state.svelte.ts`): the global keymap resolver's
  "don't handle keys while an overlay owns them" check now covers all four overlays
  (palette, Goto Anything, Goto Line, the confirm modal) from one place instead of
  growing a longer import list on every new overlay.

**Key modules**

| Path | Purpose |
|---|---|
| `apps/anvil/src-tauri/src/search.rs` | File index + `nucleo-matcher` search |
| `apps/anvil/src/lib/ui/CommandBar.svelte` | Shared bar shell (palette/Goto Anything/Goto Line) |
| `apps/anvil/src/lib/ui/GotoAnything.svelte`, `GotoLine.svelte` | The two new overlays |
| `apps/anvil/src/lib/editor/goto-line.ts` | `jumpToLine()`, shared by both line-jump paths |
| `apps/anvil/src/lib/ui/modal-state.svelte.ts` | Aggregated "is any overlay open" check |

**Deviations, and why**

- **The file index isn't invalidated by the file watcher.** A stale index just means a
  newly created file won't show up in Goto Anything until the next folder-open —
  wiring the existing per-directory watchers up to a full-index rebuild is real work
  (would need a recursive watch or watching every directory, not just expanded ones)
  that isn't justified yet.
- **`Pattern::match_list` runs matching on the calling thread** (nucleo-matcher's own
  docs recommend the full async `nucleo` crate for large-scale interactive apps).
  Acceptable here because Tauri commands already run off the main/UI thread by
  default — a slow match delays the command's own response, it doesn't freeze the
  window.

## M4, check-in 1 — Syntax highlighting + line operations (done)

**What was built**

- Real CodeMirror language support for all nine PRD §F4 languages (JS/TS/JSX/TSX,
  Svelte, HTML, CSS, SCSS/Sass, JSON, Markdown, Rust, Elixir), replacing M2's
  plain-label `language.ts` stub. **Plus PHP and YAML/YML**, added on request beyond
  the PRD's F4 list.
- A syntax highlight theme (`syntax-highlight.ts`) mapped onto new `--syntax-*` CSS
  custom properties, themselves mapped onto the *existing* palette per the PRD's
  §F10 "1999 Dark" role assignments (accent→keywords, warm→strings, danger→numbers,
  muted→comments) — see the Deviations note below on why the exact hex values
  weren't adopted.
- A `Compartment` for the per-document language extension, so an untitled buffer
  gets re-languaged in place via Save As (e.g. saving `Untitled` as `notes.md` turns
  on Markdown highlighting immediately) without rebuilding the document's state.
- Line operations: `edit.delete_line`, `edit.duplicate_line`, `edit.move_line_up`/
  `down`, `edit.toggle_comment`, `edit.indent`/`edit.outdent`, all wrapping
  `@codemirror/commands` functions, with PRD §6 default bindings plus Tab/Shift-Tab
  as additional indent/outdent bindings (a mid-check-in request — this is why the
  focus-scoping bug below exists at all).
- Dirty tracking now compares against the actual last-saved content instead of
  latching true on any edit ever — undoing back to the saved state correctly clears
  the dirty indicator.

**Deviations, and why**

- **Syntax colors don't match the PRD's exact "1999 Dark" hex values.** The PRD
  specifies exact colors (`--bg #161C26`, `--accent #F2C849`, etc.); M0 had already
  established a different (also dark, also reasonable) palette before this table was
  revisited, and the app had been live-tested against those colors for three
  milestones by this point. Remapped the *roles* the PRD specifies onto the
  *existing* values instead of silently reshuffling already-approved UI colors as a
  side effect of adding syntax highlighting. Full reconciliation belongs to M5's
  real theme-system work, if wanted then.
- **`.heex` has no real syntax highlighting** — `codemirror-lang-elixir` doesn't parse
  it. Falls through to plain text with a correct "Elixir" status-bar label, matching
  the PRD's own "if a grammar supports it" hedge.

**Bugs hit and fixed:**

- **Tab/Shift-Tab as global keybindings would have hijacked normal focus navigation**
  (moving between toolbar buttons, sidebar entries, etc. whenever the editor wasn't
  focused) — caught before it shipped, not reported. Fixed by only claiming Tab/
  Shift-Tab for indent/outdent while the editor itself has focus
  (`getActiveView()?.hasFocus`); the keymap resolver is otherwise deliberately
  focus-agnostic (PRD §4.2/§11: every command should work regardless of exactly what
  has DOM focus), so this is a narrow, Tab-specific exception, not a general pattern.
- **WebKitGTK reports `event.key` as the literal string `"Unidentified"` for
  Shift-Tab specifically** (likely an X11 `ISO_Left_Tab` keysym quirk) — `event.code`
  stays `"Tab"` regardless of shift. This broke both the outdent binding and the
  focus-scoping guard above, since both keyed off `event.key`. Fixed by adding `Tab`
  to the punctuation-style `CODE_TO_TOKEN` table in `keys.ts` (matched by code, not
  key, same reasoning as `/`, `[`, `]`) and switching the focus guard to check
  `event.code`. Covered by a regression test in `keys.test.ts` — worth remembering
  this class of bug exists if another named key ever misbehaves the same way.
- **The confirm modal's message didn't wrap a long file path** — no `overflow-wrap`,
  so an unbroken path string overflowed the dialog instead of wrapping.

## M4, check-in 2 — Multiple cursors + find/replace (done)

**What was built**

- All of F5: `selection.find_next_occurrence` (`selectNextOccurrence`), `selection.find_all`
  (`selectSelectionMatches`), `selection.add_cursor_above`/`below` (`addCursorAbove`/
  `addCursorBelow`), `selection.select_line` (`selectLine`), `selection.collapse`
  (`simplifySelection`, bound to Escape) — mostly thin wrappers around existing
  `@codemirror/commands`/`@codemirror/search` exports. Two needed custom
  implementations since CodeMirror doesn't ship them: `selection.skip_occurrence`
  (replace the last occurrence with the next one, rather than adding) and
  `selection.split_into_lines` (one cursor per line from a multi-line selection).
  Mod-click adds a cursor via `EditorView.clickAddsSelectionRange`.
- All of F6: a `FindBar.svelte` docked top-right (not a `CommandBar` overlay — it
  coexists with the editor rather than taking over input, so F3/mod+g keep working
  globally while it's open), backed by `@codemirror/search`'s state
  (`setSearchQuery`/`findNext`/`findPrevious`/`replaceNext`/`replaceAll`) rather than
  reimplementing search. Case-sensitive/whole-word/regex toggles, live match count.
- `drawSelection()` added to `baseExtensions()` — draws selections via DOM instead of
  the native browser Selection API, which doesn't reliably support multiple ranges
  (relevant here since this app runs on WebKit).

**Bugs hit and fixed:**

- **The entire multi-cursor feature silently did nothing, and it had nothing to do
  with any of F5's own command logic.** `EditorState.allowMultipleSelections` is off
  by default, and when it's off `EditorState` silently reduces every transaction's
  selection to its main range (`tr.newSelection.asSingle()`) — so `selectNextOccurrence`,
  `addCursorAbove`, mod-click, all of it, were computing correct results that then got
  discarded one layer down, at `state.update()` itself. Traced by probing
  `@codemirror/search`'s and `@codemirror/state`'s actual source (not just the type
  definitions) with a throwaway Vitest script outside the app entirely, which
  isolated the bug to `state.update({ selection })` before any of our own code was
  even in the picture. Fixed with one line: `EditorState.allowMultipleSelections.of(true)`
  in `baseExtensions()`. Covered by a regression test.
- **`find.show` didn't hide an already-visible replace row.** Deliberate at the time
  (a comment reasoned "closing shouldn't feel destructive") but wrong per how the
  user actually expects it to work: Ctrl+F should always mean *just* find, Ctrl+H
  always means find+replace, not "whichever was open most recently." Fixed by having
  `find.show` explicitly set `showReplace = false` instead of leaving it alone.
- **The find bar didn't clear its text between opens** — closing and reopening it
  kept whatever was previously typed, unlike every other overlay in the app (palette,
  Goto Anything, Goto Line all reset on open). Missing reset effect, now added.

## Post-M4 — code review fixes, keymap repeat guard, app icons

Landed after M4 check-in 2 was marked done; recorded here rather than reopening
either check-in's own log entry.

**Code review fixes (`b4f3e14`):**
- `search.rs` (M3): Goto Anything fuzzy-matched the full absolute file path instead
  of the workspace-relative path, so common substrings from the checkout's parent
  directories polluted every query's ranking. Now matches against a relative path
  precomputed once at index time (a small borrowed-candidate wrapper avoids cloning
  the path-string haystack on every keystroke, fixing an efficiency finding at the
  same time).
- `workspace-state.svelte.ts` (M4): Save-As only reconfigured the CodeMirror
  language compartment when the document being saved was the *active* tab, so
  saving a background dirty document (e.g. "save all" on quit) left it in
  plain-text highlighting until reopened. Now builds the reconfiguration off the
  document's own `editorState` directly, and additionally dispatches it to the live
  view when that view does happen to be active.
- `FindBar.svelte` (M4): the match count didn't react to document edits, only to
  the find bar's own inputs — typing with Find open left a stale count on screen.
  Fixed by reading `getCursorInfo()` (already reactive on every doc change, via the
  editor's update listener) inside the `matchInfo` derivation, purely to register
  the dependency.
- `GotoAnything.svelte` (M3): the search request had no error handling, so a
  Rust-side failure surfaced as a silent unhandled promise rejection instead of
  visible feedback. Added a `.catch` that clears results and shows a toast.

**Keymap resolver (`ef66468`):** OS key-repeat fed straight into the chord
tracker — holding the first key of a chord (e.g. `mod+k` before `mod+o`) a beat
too long turned the pending `[k]` into `[k, k]`, which matches nothing and
silently resets the chord with no feedback as to why. `handleGlobalKeydown` now
ignores `event.repeat` before it ever reaches the resolver, which stays DOM-free
per its own design (§4.3/6).

**App icons (`ef66468`):** regenerated `src-tauri/icons/*` from the new
`anvil-icons.png` via `tauri icon`, kept the generated iOS/Android sets even
though this app is desktop-only for now, and replaced the leftover
SvelteKit-scaffold favicon (an unwired default Svelte-logo SVG) with a PNG
favicon generated from the same source, wired into `+layout.svelte`.

## M5, check-in 1 — Settings and theme system (done)

**What was built**

- Settings system mirroring the keymap's exact pattern (PRD §4.4): `config.rs`
  gained `settings.jsonc` support (bundled defaults, `<app_config_dir>/settings.jsonc`,
  directory watch, hot reload), and `src/lib/settings/` holds the camelCase/snake_case
  type split, `default-settings.jsonc`, a JSONC-tolerant parser (tested) that validates
  only the fields actually present — a settings file is meant to be sparse, unlike the
  keymap's full-array validation — and the reactive store with hot reload + error toast.
  `updateSetting()` edits the user file via `jsonc-parser`'s `modify`/`applyEdits`
  rather than a full re-serialize, so hand-added comments survive a write.
- `preferences.open_settings` command, opening the file via the existing
  `workspace.open_path` flow.
- Theme system (§F10): `styles/themes/_dark.scss` reconciled to the PRD's exact hex
  table; `_light.scss` is new (no PRD hex values given for it — chosen by eye,
  WCAG-contrast-checked, ≥4.5:1 except the PRD's own literal danger value used only
  for small syntax accents). `data-theme` attribute bridge in `+layout.svelte`.
  `theme.switch` command + `ThemeSwitch.svelte` (a fourth `CommandBar` consumer,
  same shape as `Palette`/`GotoAnything`).

**Key modules**

| Path | Purpose |
|---|---|
| `apps/anvil/src-tauri/src/config.rs` | `settings.jsonc` read/write/watch, mirrors `keymap.jsonc` |
| `apps/anvil/src/lib/settings/` | types, default settings, parser, reactive store |
| `apps/anvil/src/lib/settings/themes.ts` | Theme registry, id → `data-theme` mapping |
| `apps/anvil/src/styles/themes/` | 1999 Dark / 1999 Light CSS variable blocks |
| `apps/anvil/src/lib/ui/ThemeSwitch.svelte` | `theme.switch` quick-pick |

**Deviations, and why**

- **`write_user_settings` has no validation of its own** — it persists whatever
  string it's given. The frontend validates the edited JSONC via `parseSettingsSource`
  before writing and refuses (with a toast) rather than risk further-corrupting an
  already hand-broken settings file with no repair path.
- **`preferences.open_keymap` / `preferences.open_default_keymap`** (also listed in
  §6 as palette-only commands) weren't built — scoped out to keep this check-in
  focused on settings/theme; not picked up in check-in 2 either. Still open.

**Bugs hit and fixed**

- **Missing `core:window:allow-destroy` capability.** The unsaved-changes-on-quit
  flow's `win.destroy()` always threw (a silent unhandled rejection), leaving the
  window stuck open whenever a dirty tab existed. A pre-existing gap from M2's
  close-prompt work that had just never been exercised until now. Fixed by adding
  the permission to `capabilities/default.json`.
- **Find bar infinite reactivity loop.** `FindBar.svelte`'s search-sync `$effect`
  dispatches straight to the view; that dispatch synchronously runs
  `workspace-state.svelte.ts`'s update listener, which does a read-then-write on the
  shared `documents` map — all within the same tracked scope, so Svelte attributed
  both to the dispatching effect and reran it forever on every keystroke, regardless
  of document content (reproduced even on an empty untitled file). An earlier guard
  against CodeMirror's native search-panel fallback (a real, separate bug — invalid
  queries silently opened a second, unclosable find UI) was a legitimate fix but
  didn't touch this one; root-caused via targeted console logging once static
  analysis stalled. Fixed with `untrack()` around the dispatch. **General lesson for
  this codebase: any `view.dispatch(...)` called from inside a `$effect` needs
  `untrack()` if the update listener it triggers touches shared reactive state
  (`documents`, `panes`, etc.) — otherwise the effect can end up "reading and writing
  the same state" through that indirection alone.**

## M5, check-in 2 — Font size, tab/whitespace settings (done, one known issue)

**What was built**

- Font size (F3, session-only): `--font-size-editor` CSS custom property, seeded
  from `settings.font_size` once at startup and never written back. `view.font_size_increase`
  / `_decrease` / `_reset` commands (`mod+=` / `mod+-` / `mod+0`).
- Tab size / soft tabs / word wrap: `editor-settings.ts`'s single compartment
  (`EditorState.tabSize`, `indentUnit`, conditional `EditorView.lineWrapping`), tested.
  Propagates to *every* open document, not just the active tab, via
  `applyEditorSettingsToAllDocuments` — same reasoning as the M4 Save-As
  language-compartment fix. `view.toggle_word_wrap` writes back through the same
  `updateSetting()` `theme.switch` uses.
- Save-time whitespace (§4.4): `trimTrailingWhitespaceOnSave` / `ensureNewlineAtEofOnSave`
  wired into `saveDocument`, applied to the buffer itself and not just the written
  bytes — otherwise the dirty indicator would relight immediately after a save that
  changed content, since `contentMatches` compares the live doc against `savedContent`.

**Bugs hit and fixed**

- `applyEditorSettingsToAllDocuments` iterates and writes the shared `documents`
  map, same as the Find bar bug's shape — its entire body is wrapped in `untrack()`
  so calling it from the settings-watching `$effect` in `+layout.svelte` can't loop
  the same way.

**Known issue (unresolved)**

- **Line numbers don't stay vertically aligned with their line as font size changes**
  (increase, decrease, or reset). Tried: `view.requestMeasure()` after the CSS var
  change (CodeMirror doesn't know to remeasure on an external CSS change it didn't
  dispatch), and an explicit unitless `lineHeight` on the theme root so
  `.cm-content`/`.cm-gutters` can't resolve to different browser-default line-heights.
  Neither fully fixed it per live testing. Root cause not yet found — this
  environment has no GUI access to iterate visually. Revisit once that exists.

## M5, check-in 3 — Empty state, large-file/binary handling, F2 reload (done)

**What was built**

- **Empty state (F1):** the sidebar's existing "no folder open" state was missing
  the Goto Anything mention the PRD asks for; added it (still one line, not a
  tutorial). No separate empty state was added for "folder open, zero tabs" — F1's
  own text scopes this to the no-folder-open case specifically.
- **Large-file warning (F3):** `get_file_size` (Rust) checked before reading, so a
  huge file doesn't get read into memory just to find out it's huge. Above 10 MB,
  a confirm prompt ("Open Anyway?") gates the read — via a generalized
  `ConfirmModal`/`confirm.svelte.ts` that now supports a plain 2-button confirm
  alongside the existing 3-button unsaved-changes flow, rather than a second modal
  component. Both `file.open` and `workspace.open_path` (sidebar, Goto Anything,
  `preferences.open_settings`) funnel through one shared `readFileWithChecks()`.
- **Binary/non-UTF-8 handling (F3):** `read_file` switched from `fs::read_to_string`
  to explicit `fs::read` + `String::from_utf8`, so an invalid file gets a clean
  "isn't valid UTF-8 text" message instead of Rust's raw I/O error text. Already
  reaches the user via the existing command-registry error-to-toast handling — no
  new UI needed. Doubles as binary-file detection without separate sniffing logic,
  matching the PRD's own framing of the two as closely related.
- **F2 external-change reload:** a new per-open-document file watcher
  (`WatchedFiles` in `workspace.rs`, mirroring `config.rs`'s keymap/settings watcher
  pattern) — separate from the sidebar's `WatchedDirs`, which only covers expanded
  directories and wouldn't catch a file opened outside the workspace root or in a
  collapsed one. Started on open and on Save-As (path changes unwatch the old path,
  watch the new one), stopped on close. On an external change: a clean tab reloads
  silently (buffer replaced only if content actually differs, so the app's own save
  landing doesn't churn undo history); a dirty tab gets a non-blocking toast and is
  left alone.

**Key modules**

| Path | Purpose |
|---|---|
| `apps/anvil/src-tauri/src/workspace.rs` | `WatchedFiles`, `watch_file_cmd`/`unwatch_file_cmd` |
| `apps/anvil/src-tauri/src/fs.rs` | `get_file_size`, UTF-8-explicit `read_file` |
| `apps/anvil/src/lib/workspace/file-io.ts` | `readFileWithChecks`, `watchFile`/`unwatchFile` |
| `apps/anvil/src/lib/ui/confirm.svelte.ts` | Generalized confirm request (`askConfirm` alongside `askUnsavedChanges`) |

**Bugs hit and fixed**

- The initial fire-and-forget `watchFile`/`unwatchFile` calls in `openDocument`/
  `closeTabSilently` broke `workspace-state.test.ts` (pre-existing since M2, missed
  earlier in this milestone) — real Tauri IPC isn't available under Vitest, and an
  unmocked `invoke()` throws synchronously in that environment. Fixed two ways:
  wrapped both calls in quiet error-swallowing helpers (`watchFileQuietly`/
  `unwatchFileQuietly` — a failed watch is best-effort background infra, not worth
  a toast or blocking a caller on) and updated the test file's mocks to cover the
  two new `file-io` exports by default, not just the tests that already mocked
  `readFile`/`writeFile`/`saveAsDialog`.

## Post-M5 — dev-server CSS bug (fixed), one known cosmetic issue left

Found live-testing check-in 3, not caused by any app code — `node_modules/vite`
(v8.3.0) predates this session (installed at M0 scaffolding time), so this was
always latent, just never exercised until a `tauri dev` cold start finally hit it.

**Bug (fixed):** `vite@8` / `@sveltejs/vite-plugin-svelte@7.3.0` (latest available —
no newer patch exists) has a dev-server-only bug where the plugin's virtual-CSS-module
cache (`meta.svelte.css` in Vite's module graph) intermittently comes back empty for
components that compiled and cached fine moments earlier. Vite's loader falls back to
serving the component's *raw source* as the "css", which the browser silently discards
as invalid — components render with no styles at all. Confirmed via direct requests to
the dev server: two unrelated, untouched components both hit it, in a fixed order that
should have ruled out a race, on a single clean process with no other dev server
running (an earlier, wrong theory — logged and corrected here for the record). Not
present in `yarn build`, which bundles CSS through a different path.

**Fix:** `emitCss: false` added to `vite.config.ts`'s `sveltekit({...})` call (forwarded
to vite-plugin-svelte — SvelteKit passes through any option it doesn't recognize
itself). Styles now compile directly into each component's JS and get injected via
`$.append_styles(...)`/`style.textContent` at runtime, bypassing the broken virtual-module
path entirely rather than working around its symptoms. Verified directly: the compiled
Sidebar module now embeds real, correctly-scoped CSS inline and no longer references the
virtual CSS URL at all.

**Known issue (cosmetic, unresolved):** the dev console still logs `[vite-plugin-svelte:load]
failed to load virtual css module ...` for most components on every `tauri dev` start.
Root cause: SvelteKit always does one SSR pass even for a fully client-rendered app, and
that SSR pass independently looks up the same compiled-CSS metadata — for what's likely a
separate critical-CSS/accounting purpose unrelated to `emitCss`. Since nothing downstream
consumes that particular lookup's result anymore, the failure has no visible effect, just
log noise. Left as-is rather than spending more time silencing an SSR-only warning this
close to done — revisit if it ever turns out to matter.
