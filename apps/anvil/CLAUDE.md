# Anvil

A Sublime Text-inspired code editor. Tauri + SvelteKit + CodeMirror 6.

Full spec: `docs/anvil-v1-prd.md` (repo root). Read the sections relevant to the
current milestone rather than the whole file.

## Architecture invariants

These are easy to violate and expensive to undo. Treat them as hard rules.

**1. Every user-facing action is a registered command.**
Including anything triggered by mouse or menu. A sidebar button calls
`run("file.save")` — it does not import a `save()` function. This is what makes
everything rebindable and what makes a plugin system possible later.

**2. The command registry is mutable at runtime.**
`register(command, source)` / `unregisterBySource(source)`, with `source: "core"`
for now. Not a frozen object assembled at import time.

**3. Documents own buffers. Tabs only reference them.**

```
documents: Map<docId, Document>   // Document owns editorState, isDirty, path
panes: Pane[]                     // always length 1 for now
Tab { id, docId, isPreview }      // tabs belong to a pane, not to the app
```

Split panes are planned (~v1.2–v1.5). One file must be able to appear in two panes
without forking its buffer. Dirty state, saves, and file-watcher reloads key off
`docId`, never off a tab.

**4. Never reach for "the active editor" directly.**
Go through `getActiveView()` / `getActiveDocument()`, which resolve
activePane → activeTab → docId → document. Every command uses these. When panes
ship, only these accessors change.

**5. Do not build pane features.** No splitting commands, no resizing, no focus
traversal, no layout persistence. `panes` is an array of length one and the layout
renders `panes[0]`. The data shape is the entire concession.

**6. The keymap resolver is pure and unit-tested.**
Normalization, merging, chord resolution, and platform filtering are DOM-free
functions with Vitest coverage. The window `keydown` listener is a thin caller.

## Rust vs frontend

**Rust** (`src-tauri/`): file read/write with encoding and line-ending preservation,
gitignore-aware directory walking, the file index and fuzzy matching for Goto Anything,
file watching, config path resolution.

**Frontend** (`src/`): CodeMirror hosting, command registry, keymap resolver, all UI,
theming.

Don't move text-buffer work into Rust. CodeMirror owns the buffer.

## Layout

```
src/lib/commands/   # registry + command definitions by category
src/lib/keymap/     # parser, normalizer, resolver (pure, tested), default-keymap.jsonc
src/lib/settings/   # defaults, loader, reactive state
src/lib/editor/     # CodeMirror setup, language map, theme bridge
src/lib/workspace/  # document/pane/tab state, file IPC wrappers
src/lib/ui/         # Sidebar, Tabs, Palette, GotoAnything, StatusBar, FindBar, Toast
src/styles/         # app.scss, _tokens.scss, _reset.scss, themes/
```

## Conventions specific to this app

- Command IDs: `category.action_name` — snake_case action, dot-separated.
  Core commands stay in known namespaces so third-party ones are unambiguous later.
- CodeMirror theming reads CSS custom properties (`var(--syntax-keyword)`), so a
  theme switch never requires reconfiguring CodeMirror.
- Do not pull in CodeMirror's opinionated keymaps (search keymap, etc.). Bindings
  come from the JSON keymap. Include only fundamentals: cursor movement, text entry,
  clipboard.
- Config parse errors must never crash the app or wipe bindings — keep the last good
  config and show a toast with the error location.
- Match punctuation and shifted bindings on `event.code`, letters on `event.key`.

## Out of scope for v1

LSP, autocomplete, plugins, git integration, split panes, project-wide find/replace,
integrated terminal, minimap, session restore. If one seems necessary to finish a
milestone, stop and ask rather than adding it.

<!-- Minimap is a deferred *core* feature, not a plugin — see PRD §11 if it comes up.
     CLI launcher (`anvil .`) is v1.1, but keep workspace.open_folder accepting an
     optional path argument so it's additive later. -->