# Anvil — v1 PRD

> Part of the **1999 App Suite**: simple, focused, no-bloat desktop apps. No ads, no subscriptions, no cloud. One-time purchase. If it needs a tutorial, it's too complicated.

## How to use this document (for Claude Code)

- Build **one milestone at a time** (see Milestones). Stop at the end of each milestone for review before continuing.
- Anvil is the **first app built in this monorepo**, so there are no sibling apps to copy conventions from. Whatever structure gets established here — workspace layout, Sass organization, Tauri config — becomes the pattern the rest of the suite follows. Keep it plain and obvious.
- Get the project structure right first, then refine. Avoid over-engineering: no abstractions for features that aren't in this PRD.
- Build logic in isolation (with tests) before layering on visuals, especially the keymap resolver.
- Use **Yarn** (workspaces), never npm or pnpm.
- Use **Svelte 5 runes** (`$state`, `$derived`, `$effect`) and `.svelte.ts` modules for shared state. Do not use legacy Svelte stores.
- When a decision isn't covered here, pick the simplest option and note it in the milestone summary.

---

## 1. Overview

A fast, minimal, keyboard-driven code editor inspired by Sublime Text. v1 should be good enough for the author to use daily on his own stack (TypeScript, Svelte, SCSS, Rust, Elixir).

The core idea is taken from Sublime: **every action is a named command, and keybindings map key sequences to command IDs.** The command palette, the keymap file, and future plugins all sit on top of this one registry.

### Goals
- It should feel instant: fast startup, no perceptible typing latency.
- The Sublime essentials: multiple cursors, command palette, Goto Anything.
- Keybindings that are fully rebindable through a Sublime-style JSON keymap file.
- The suite's visual identity (dark, minimal, Red Hat Mono), themeable via CSS custom properties.

### Non-goals (v1)
- LSP, autocomplete, or IntelliSense
- Plugins or extension API (see §11 — the groundwork is deliberate, the system is not built)
- Git integration
- Split panes (planned for a later version — the state model accommodates them per 4.1a, but no splitting ships in v1) or multiple windows
- Project-wide find/replace
- Integrated terminal
- Minimap (a core view feature, deferred — not a plugin; see §11)
- Session restore / hot exit
- Any network access or telemetry

## 2. Platforms

- **Primary:** Linux (Fedora) and macOS.
- Windows: should build with Tauri, but it is untested and unsupported in v1.
- All default keybindings use `mod`, which means Cmd on macOS and Ctrl on Linux/Windows.

## 3. Tech stack

| Layer | Choice |
|---|---|
| App shell | Tauri 2 |
| UI | SvelteKit (static adapter) + Svelte 5 runes |
| Editor engine | CodeMirror 6 |
| Styling | Sass + CSS custom properties |
| Backend | Rust (Tauri commands) |
| Package manager | Yarn workspaces |
| Tests | Vitest (frontend logic), `cargo test` (Rust) |

**Location:** `apps/anvil` in the `1999-app-suite` monorepo. If the Yarn workspace root doesn't exist yet, set it up first: root `package.json` with `"private": true` and `workspaces: ["apps/*", "packages/*"]`, and no Lerna.

### Rust crates (suggested)
- `ignore` walks the folder tree while respecting `.gitignore` (the same crate ripgrep uses).
- `nucleo-matcher` does fuzzy file matching for Goto Anything.
- `notify` (with a debouncer) watches files for changes on disk.
- `serde` / `serde_json`, plus a JSONC-tolerant parser for config files (or parse JSONC on the frontend, whichever is simpler).

### CodeMirror packages
- Core: `@codemirror/state`, `@codemirror/view`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/search`.
- Languages: `@codemirror/lang-javascript` (JS/TS/JSX/TSX), `@codemirror/lang-html`, `@codemirror/lang-css`, `@codemirror/lang-sass`, `@codemirror/lang-json`, `@codemirror/lang-markdown`, `@codemirror/lang-rust`.
- Community languages: a Svelte grammar (e.g. `@replit/codemirror-lang-svelte`) and an Elixir grammar (e.g. `codemirror-lang-elixir` / `lezer-elixir` from the Livebook team). Verify that each package is current before adding it.

## 4. Architecture

### 4.1 Responsibility split

**Rust backend** (Tauri commands):
- Read and write files, handling UTF-8 correctly and preserving line endings.
- Walk the workspace folder, respecting `.gitignore`, and always hiding `.git`, `node_modules`, `target`, `_build`, and `deps`.
- Maintain a file index and do fuzzy matching for Goto Anything.
- Watch the workspace and config files, emitting events to the frontend on changes.
- Resolve config paths (`app_config_dir`) and create default config files on first run.

**Svelte frontend:**
- Host the editor through CodeMirror `EditorView`. Each tab gets its own `EditorState`, and the tab keeps its state when switched away from, so undo history and cursors survive.
- Own the command registry, keymap resolver, and palette.
- Render the UI: sidebar, tabs, palette, Goto Anything, status bar.
- Apply themes.

### 4.1a State model (built pane-ready, ships with one pane)

Split panes are planned for a later version (roughly v1.2–v1.5). v1 renders exactly one pane and has no splitting UI or commands, but the state model below must be in place from the start, because retrofitting it later means rewriting every command that touches the editor.

**Three levels, not two.** The naive model is `tabs[]` plus `activeTab`. Use this instead:

```
workspace
  documents: Map<docId, Document>   // one per open file — the source of truth
  panes: Pane[]                     // v1: always exactly one
  activePaneId

Document   { id, path | null, editorState, isDirty, language, lineEnding }
Pane       { id, tabs: Tab[], activeTabId }
Tab        { id, docId, isPreview }
```

Why it matters:
- **A document is not a tab.** Once panes exist, the same file can be open in two panes at once. If the buffer lives on the tab, that becomes two divergent copies of one file. Keeping `editorState` on the `Document` and having tabs reference it by `docId` avoids that entirely.
- **Dirty state, file-watcher reloads, and save all key off `docId`**, never off a tab. In v1 the mapping happens to be one-to-one; the code should not assume it.
- **Tabs belong to a pane**, not to the app. Even with one pane, tab operations should go through the pane rather than a global tab list.

**Rules for v1 code:**
- Never reach for "the active editor" directly. Resolve it through one accessor — `getActiveView()` / `getActiveDocument()`, going activePane → activeTab → docId → document. Every command uses it. When panes arrive, only that accessor changes.
- `CommandContext` carries the pane, not just the view:
  ```ts
  interface CommandContext {
    view: EditorView | null;        // active pane's active view
    doc: Document | null;
    pane: Pane;                     // active pane
    workspace: WorkspaceState;
  }
  ```
- Any command that opens a file — sidebar click, Goto Anything, `file.new`, `tab.reopen_closed` — opens **into the active pane**. Write it that way in v1 even though there's only one.
- Preview tabs are **per-pane**: the "at most one preview tab" rule in F2.1 is scoped to a pane, not globally.
- The status bar reads from the active pane's active document.
- Do **not** build a pane abstraction beyond this shape. No splitting commands, no pane resizing, no focus-traversal keybindings, no layout persistence. `panes` is an array of length one and the layout component renders `panes[0]`. That is the whole concession.

One thing to be aware of for later: CodeMirror pairs one `EditorState` with one `EditorView`. Showing the same document in two panes means two views over one state, which requires forwarding transactions between them. That's a real piece of work, but it's a later problem — and it's a solvable one only if the buffer lives on the document rather than the tab, which is exactly what this model sets up.

### 4.2 Command registry (the spine)

```ts
interface Command {
  id: string;            // "edit.duplicate_line", "file.save", "palette.show"
  title: string;         // "Edit: Duplicate Line" (shown in the palette)
  run: (ctx: CommandContext, args?: Record<string, unknown>) => void | Promise<void>;
  hidden?: boolean;      // exclude from palette (e.g. tab.focus with index args)
}
```

- IDs follow the pattern `category.action_name`, using snake_case for the action.
- **Every** user-facing action must be a registered command, including actions triggered by mouse or menu, so that everything is bindable.
- The registry is **mutable at runtime**, not a frozen object assembled at import time: `register(command, source)` and `unregisterBySource(source)`, where `source` is `"core"` in v1. This costs nothing now and is the single thing that makes a plugin system additive later rather than a rewrite (see §11).
- Editor commands wrap CodeMirror commands where they exist (e.g. `selectNextOccurrence`, `toggleComment`, `moveLineUp`/`moveLineDown`, `copyLineDown`, `deleteLine`, `selectLine`, `indentMore`/`indentLess`) and run them on the active `EditorView`. Missing ones, such as split-selection-into-lines and skip-occurrence, are implemented as small local functions.

### 4.3 Keymap system

**The JSON keymap is the single source of truth for any binding a user might want to change.**

- A window-level `keydown` listener runs the resolver, which normalizes the event, tracks pending chords, looks up the sequence, and dispatches the command.
- Include only CodeMirror's minimal fundamentals (cursor movement, basic text entry, clipboard). Do **not** include CodeMirror's opinionated keymaps (search keymap, etc.), because those bindings come from the JSON instead.
- The resolver must be pure logic that can be unit-tested with Vitest, separate from the DOM.

**Files:**
- Default keymap: bundled with the app (e.g. `src/lib/keymap/default-keymap.jsonc`).
- User keymap: `<app_config_dir>/keymap.jsonc`. On first run, create it with a comment header and an empty array.

**Format** (Sublime-style, JSONC so comments and trailing commas are allowed):

```jsonc
[
  { "keys": ["mod+shift+p"], "command": "palette.show" },
  { "keys": ["mod+k", "mod+b"], "command": "sidebar.toggle" },          // chord
  { "keys": ["mod+1"], "command": "tab.focus", "args": { "index": 0 } },
  { "keys": ["alt+f3"], "command": "selection.find_all", "platform": "linux" },
  { "keys": ["ctrl+mod+g"], "command": "selection.find_all", "platform": "macos" },
  { "keys": ["mod+d"], "command": null }                                  // unbind
]
```

**Rules:**
- `keys` is an array of keystrokes; more than one keystroke makes a chord.
- Modifiers are `mod`, `ctrl`, `alt` (alias `option`), `shift`, and `super` (alias `cmd`). Matching ignores their order and case.
- `platform` is optional: `"macos" | "linux" | "windows"`. Entries for other platforms are ignored.
- `args` is optional and passed through to `run`.
- `context` is **reserved** for future conditional bindings and ignored in v1.
- Merge order: defaults first, then user entries. For identical key sequences, the later entry wins. `"command": null` removes a binding.
- Chords: after a prefix keystroke matches, wait for the next key. Any non-matching key cancels. Show the pending prefix in the status bar (e.g. `mod+k …`). Escape cancels.
- For punctuation and shifted symbols (`mod+/`, `mod+shift+/`, `mod+[`), match on `event.code` so that shift and keyboard layout don't break bindings. Use `event.key` for letters.
- Hot reload: when the user keymap file changes on disk, re-parse it. If parsing fails, **keep the previous keymap** and show a non-blocking error toast with the parse error location.
- Commands:
  - `preferences.open_keymap` opens the user keymap in an editor tab.
  - `preferences.open_default_keymap` opens the defaults read-only, for reference.

### 4.4 Settings

The same pattern as the keymap: bundled defaults plus `<app_config_dir>/settings.jsonc`, hot-reloaded, with a toast on errors. Keep the setting set small:

```jsonc
{
  "theme": "1999-dark",
  "font_size": 14,
  "tab_size": 2,
  "translate_tabs_to_spaces": true,
  "word_wrap": false,
  "trim_trailing_whitespace_on_save": false,
  "ensure_newline_at_eof_on_save": true
}
```

The `preferences.open_settings` command opens the settings file in a tab.

## 5. Features

### F1 — Workspace & sidebar
- Open a folder with `workspace.open_folder`, using the native dialog (Tauri dialog plugin).
- The sidebar shows the file tree, loading directory contents lazily when a folder is expanded.
- Single-click opens a file in a **preview tab** (see F2.1). Double-click opens it as a permanent tab. If the file is already open, focus its tab instead.
- The tree updates when files are created, deleted, or renamed on disk.
- The sidebar can be toggled.
- If no folder is open, the app shows an empty state: a short line of text naming the Open Folder / Goto Anything shortcuts. It should not be a tutorial.
- Creating, renaming, or deleting files from the sidebar is out of v1 scope. The exception is `file.new`, which creates an untitled buffer that Save As writes to disk.

### F2 — Tabs
- Open, close, and switch tabs. Show a dirty indicator (●) for unsaved changes.
- Closing a dirty tab prompts: Save / Don't Save / Cancel.
- Quitting with dirty tabs shows the same prompt, using Tauri's close-requested event.
- `tab.reopen_closed` reopens the most recently closed tab.
- Each open document keeps its own `EditorState` (see 4.1a), so undo history, selection, and scroll position survive tab switches.
- If a file changes on disk and the tab has no unsaved changes, reload it silently. If the tab is dirty, show a non-blocking notice and do not overwrite the user's buffer.

### F2.1 — Preview tabs

Sublime's behavior: browsing files shouldn't litter the tab bar.

- At most **one** preview tab exists at a time. Opening a new preview replaces the existing one rather than adding a tab.
- A preview tab's title is rendered in *italic* to distinguish it.
- A preview tab is **promoted** to a permanent tab when any of these happen:
  - the user edits the buffer;
  - the user double-clicks the file in the sidebar or double-clicks the tab itself;
  - the user runs `tab.keep_open`;
  - the file is saved.
- Opening a file that is already open in a preview tab focuses it and leaves it in preview state, unless the action was a promoting one.
- Sources and their behavior:
  - Sidebar single-click → preview. Double-click → permanent.
  - Goto Anything, Enter → permanent tab (this matches Sublime).
  - `file.new` → always permanent.
- Preview state is not a dirty state. A preview tab that becomes dirty has already been promoted by the edit that dirtied it, so the close prompt logic in F2 is unaffected.
- **Out of scope for v1:** Sublime's live preview while arrowing through Goto Anything results. The panel shows results only; nothing opens until Enter.

### F3 — Editing core
- Undo/redo, auto-indent, bracket matching, auto-close brackets and quotes.
- Line numbers, current-line highlight, and a visible whitespace selection highlight.
- Tab size and soft tabs come from settings.
- Word wrap is controlled by a setting and toggled with the `view.toggle_word_wrap` command.
- Font size can be increased or decreased via commands. The change lasts for the session only; persistence is optional.
- Preserve each file's existing line endings and encoding (UTF-8 only in v1). Show an error for binary or non-UTF-8 files instead of opening garbage.
- Large files: files up to ~10 MB must open without freezing. Above that, show a warning before opening.

### F4 — Syntax highlighting
Languages are detected by file extension:
- JS/TS/JSX/TSX
- Svelte
- HTML
- CSS
- SCSS/Sass
- JSON
- Markdown
- Rust
- Elixir (`.ex`, `.exs`, `.heex` if a grammar supports it)

Unknown extensions open as plain text.

### F5 — Multiple cursors
- Select next occurrence (`mod+d`), and skip an occurrence (`mod+k mod+d`).
- Select all occurrences.
- Split a selection into one cursor per line (`mod+shift+l`).
- Add a cursor above or below.
- Mod-click adds a cursor.
- Escape collapses back to a single cursor.

### F6 — Find & replace (in file)
- A find bar with a match count, case-sensitive toggle, whole-word toggle, and regex toggle.
- Find next and find previous.
- Replace one, and replace all.
- The bar uses the suite's own styling, not CodeMirror's default panel look. Reusing CodeMirror's search logic underneath is fine.

### F7 — Command palette
- Opens with `mod+shift+p`.
- Fuzzy-searches registered command titles, skipping commands marked `hidden`. Fuzzy matching on the frontend is fine for this small list.
- Each row shows the command's current keybinding(s), read from the live merged keymap.
- Enter runs the selected command. Escape closes the palette and returns focus to the editor.
- Recently used commands are sorted first.

### F8 — Goto Anything
- Opens with `mod+p`.
- Fuzzy-matches file paths in the workspace. Matching is done in Rust with `nucleo-matcher`, and results come back ranked.
- Results should update on every keystroke with no visible lag on a repo of ~20k files.
- Show the file name prominently and the relative path dimmed.
- Enter opens the file. Arrow keys navigate the results.
- **Stretch:** a `:42` suffix (e.g. `app.scss:42`) jumps to that line.

### F9 — Status bar
Shows:
- Line and column (with the selection count when there are multiple cursors).
- The detected language.
- Indentation (e.g. `Spaces: 2`).
- Line endings (LF/CRLF).
- Any pending chord prefix.

### F10 — Theming
- Themes are sets of CSS custom properties, applied via a `data-theme` attribute on the root element.
- CodeMirror's editor theme and syntax highlight style must reference those CSS variables (`var(--syntax-keyword)`, etc.), so that switching themes needs no CodeMirror reconfiguration.
- `theme.switch` opens a quick-pick list of available themes. The choice is written back to settings.
- Ship two themes, to prove that switching works:
  - **1999 Dark** (default)
  - **1999 Light**

**1999 Dark** starts from the suite palette. Add neutral tokens as needed and tune syntax colors by eye.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#161C26` | editor background |
| `--surface` | `#363540` | sidebar, tabs, palette, selection base |
| `--accent` | `#F2C849` | cursor, active tab marker, keywords |
| `--warm` | `#BF8F73` | strings |
| `--danger` | `#D9483B` | errors, numbers/constants |
| `--fg` | _new neutral_ | body text |
| `--muted` | _new neutral_ | comments, line numbers, dimmed paths |

- Font: **Red Hat Mono** for everything, bundled locally with no CDN.
- Spacing: 8px base.
- Styling structure: a `src/styles/` directory with `app.scss` (main), `_tokens.scss` (variables), and `_reset.scss`. Themes live in `styles/themes/`. Split into additional partials only when complexity warrants it — this app is larger than a timer, so component-level partials will be justified sooner.
- The window is resizable, with a sensible minimum size (e.g. 800×500).

## 6. Default keybindings

These follow Sublime defaults where practical. The whole point is that they're all rebindable. Verify the Linux defaults against Sublime's `Default (Linux).sublime-keymap` and adjust where muscle memory differs.

| Command | macOS | Linux |
|---|---|---|
| `goto.anything` | cmd+p | ctrl+p |
| `palette.show` | cmd+shift+p | ctrl+shift+p |
| `goto.line` | ctrl+g | ctrl+g |
| `file.new` | cmd+n | ctrl+n |
| `file.save` | cmd+s | ctrl+s |
| `file.save_as` | cmd+shift+s | ctrl+shift+s |
| `workspace.open_folder` | cmd+k cmd+o | ctrl+k ctrl+o |
| `tab.close` | cmd+w | ctrl+w |
| `tab.reopen_closed` | cmd+shift+t | ctrl+shift+t |
| `tab.next` / `tab.prev` | ctrl+tab / ctrl+shift+tab | ctrl+tab / ctrl+shift+tab |
| `tab.focus` (1–9) | cmd+1…9 | alt+1…9 |
| `sidebar.toggle` | cmd+k cmd+b | ctrl+k ctrl+b |
| `selection.find_next_occurrence` | cmd+d | ctrl+d |
| `selection.skip_occurrence` | cmd+k cmd+d | ctrl+k ctrl+d |
| `selection.find_all` | ctrl+cmd+g | alt+f3 |
| `selection.split_into_lines` | cmd+shift+l | ctrl+shift+l |
| `selection.add_cursor_above` / `below` | ctrl+shift+up / down | ctrl+alt+up / down |
| `selection.select_line` | cmd+l | ctrl+l |
| `edit.delete_line` | ctrl+shift+k | ctrl+shift+k |
| `edit.duplicate_line` | cmd+shift+d | ctrl+shift+d |
| `edit.move_line_up` / `down` | ctrl+cmd+up / down | ctrl+shift+up / down |
| `edit.toggle_comment` | cmd+/ | ctrl+/ |
| `edit.indent` / `edit.outdent` | cmd+] / cmd+[ | ctrl+] / ctrl+[ |
| `edit.undo` / `edit.redo` | cmd+z / cmd+shift+z | ctrl+z / ctrl+shift+z (+ ctrl+y) |
| `find.show` | cmd+f | ctrl+f |
| `find.show_replace` | cmd+alt+f | ctrl+h |
| `find.next` / `find.prev` | cmd+g / cmd+shift+g | f3 / shift+f3 |
| `view.font_size_increase` / `decrease` | cmd+= / cmd+- | ctrl+= / ctrl+- |
| `app.quit` | cmd+q | ctrl+q |

Commands with no default binding, reachable from the palette:
- `tab.keep_open` (promotes a preview tab to permanent)
- `theme.switch`
- `view.toggle_word_wrap`
- `preferences.open_keymap`
- `preferences.open_default_keymap`
- `preferences.open_settings`

## 7. Suggested file structure

```
apps/anvil/
  src/
    lib/
      commands/        # registry + command definitions grouped by category
      keymap/          # parser, normalizer, resolver (pure, tested), default-keymap.jsonc
      settings/        # defaults, loader, reactive settings state
      editor/          # CodeMirror setup, language map, theme bridge to CSS vars
      workspace/       # tree state, tabs state, file IPC wrappers
      ui/              # Sidebar, Tabs, Palette, GotoAnything, StatusBar, FindBar, Toast
    styles/            # app.scss, _tokens.scss, _reset.scss, themes/
    routes/+page.svelte
  src-tauri/
    src/
      main.rs / lib.rs
      fs.rs            # read/write, encoding + line-ending handling
      workspace.rs     # ignore-aware walk, index, watcher
      fuzzy.rs         # nucleo matching
      config.rs        # config dir, first-run defaults, config file watching
```

## 8. Non-functional requirements

- **Startup:** the window is usable in under 1 second on a modern machine.
- **Typing:** no perceptible latency, including with multiple cursors active.
- **Offline:** no network requests of any kind and no telemetry. Tauri capabilities should be scoped to only the plugins and commands actually used.
- **Robustness:** config parse errors never crash the app or wipe bindings. File write errors show a toast and leave the buffer dirty.
- **Tests:**
  - Vitest for keymap parsing, normalization, merging, chord resolution, and platform filtering.
  - `cargo test` for the ignore-aware walk and fuzzy ranking.

## 9. Milestones

**M0 — Scaffold**
- Set up the Yarn workspace root if it doesn't exist, then create `apps/anvil` with Tauri 2 + SvelteKit + Svelte 5 (`npm create tauri-app@latest` for scaffolding is fine; switch to Yarn immediately after).
- Mount CodeMirror in a single view.
- Open and save one file via the native dialog.
- Set up the Sass structure, Red Hat Mono, and dark tokens.

**M1 — The spine**
- Command registry.
- Keymap parser and resolver, with Vitest tests, including chords, `mod`, `platform`, and `null` unbinding.
- Default keymap file, plus the user keymap file with hot reload and error toasts.
- Command palette showing live keybindings.

**M2 — Workspace**
- Open folder.
- Ignore-aware sidebar tree, updated by the file watcher.
- The document/pane/tab state model from 4.1a, with the single `getActiveView()` accessor in place and every editor command routed through it.
- Tabs with per-document `EditorState`, dirty tracking, and close/quit prompts.
- Preview tabs, with promotion rules.
- Status bar.

**M3 — Goto Anything**
- Rust file index and nucleo matching.
- Goto Anything UI.
- `goto.line`.
- Stretch: `file:line` jumping.

**M4 — Editing power**
- All F4 languages.
- Multiple-cursor commands.
- Line operations.
- Find/replace bar.

**M5 — Polish**
- Settings file with hot reload.
- Theme system with CSS variable bridge, plus 1999 Light and `theme.switch`.
- Font size commands.
- Save-time whitespace options.
- Empty state.
- Large-file warning and binary-file handling.

## 10. Decisions & deferred items

**Decided:**
- **Name:** Anvil. The binary, the app directory (`apps/anvil`), and the eventual CLI all use this name.
- **Design tokens:** keep them local to `apps/anvil/src/styles/_tokens.scss` for now. Anvil is the first app in the monorepo, so there's nothing to share with yet. Extract a `packages/tokens` workspace when the second app needs the same palette — that's the point where duplication actually costs something.
- **Preview tabs:** in scope, specified in F2.1.
- **Split panes:** planned, roughly v1.2–v1.5. Not built in v1, but the state model in 4.1a is shaped for them so the later work is additive rather than a rewrite.

**Deferred to v1.1:**
- **CLI launcher.** `anvil .` opens the current directory; bare `anvil` does the same (assume `.`); `anvil <path>` opens a specific folder or file. Two pieces are needed: Tauri must read CLI arguments at startup and treat a directory argument as the workspace to open, and the build must install a shell-accessible `anvil` binary — a symlink into `/usr/local/bin` on macOS and Linux, or a `.desktop` entry plus a wrapper script on Linux. Worth keeping in mind during M2 so that workspace-opening isn't hardwired to the dialog: `workspace.open_folder` should take an optional path argument, with the dialog used only when no path is given.

**Still open (none blocking v1):**
- **Multiple windows.** Separate from split panes, and a much bigger lift in Tauri since each window is its own webview with its own frontend state. No decision needed now.
- **Session restore.** Currently a non-goal, but once panes exist there's a layout worth remembering. If it ever ships, the 4.1a model serializes cleanly.

## 11. Plugins — groundwork, not implementation

The suite vision lists this app as "plugin-friendly," and that remains the long-term intent. **No plugin system ships in v1.** This section exists so the v1 build doesn't accidentally foreclose one, and so the decision to defer is a recorded choice rather than an oversight.

### What already counts as groundwork

Most of the foundation is in this PRD for other reasons, which is the good kind of overlap:

- **Command registry (§4.2).** In Sublime, a plugin is mostly "a thing that registers commands." Anvil's registry is the same shape, and now mutable at runtime with source tags, so a loader can add and remove a plugin's commands cleanly.
- **Keymap by command ID (§4.3).** Bindings resolve strings to commands, so a plugin's commands are bindable the day they exist, with no keymap changes. The reserved `context` field matters here too — conditional bindings are how plugins scope behavior to a mode or file type.
- **Every action is a command (§4.2).** This is what makes a plugin able to compose existing behavior instead of reimplementing it.
- **Serializable `args`.** Lets a plugin invoke commands declaratively.
- **Theming via CSS custom properties (§F10).** A plugin's UI inherits the theme for free if it uses the variables.
- **JSONC config with hot reload (§4.4).** The same loader pattern extends to per-plugin settings.

### Discipline rules for v1 (cheap, worth following)

- Route UI through commands. A sidebar button calls `run("file.save")`, not a `save()` import. Already required by §4.2 — this is the reason it's required.
- Namespace core command IDs consistently so a third-party namespace (`myplugin.foo`) is unambiguous later.
- Keep the command registry's public surface small and boring: register, unregister, run, list.

That's the whole list. Anything beyond it is speculative.

### What is explicitly NOT being decided now

The hard parts of a plugin system are not the registry — they're these, and every one depends on information you won't have until the editor has been used for real work:

- **The runtime.** JS in a sandboxed worker, WASM, or an embedded scripting language? Each has very different security and ergonomics.
- **The API surface.** Which internals become a stable contract? This is the irreversible decision — once plugins depend on an API, changing it breaks them. Designing it before you've written a plugin yourself means guessing.
- **Security.** Plugins are arbitrary code inside a Tauri app with filesystem access. Sublime's Python plugins are fully trusted; that's a defensible choice, but it is a choice, and it needs Tauri capability scoping thought through.
- **Distribution.** A registry, or just "drop a folder in the config directory"?

There's also a product tension worth naming: plugin ecosystems are one of the main ways editors become bloated, which cuts against the suite's whole premise. "Plugin-friendly" is likely better served by a small, curated extension surface than by an open ecosystem. That's a decision for when it's actually in front of you.

### Why the minimap is not a plugin

Taking the example directly: a minimap isn't a good candidate for a plugin, in Anvil or anywhere.

It needs the document, the syntax highlighting, the viewport scroll position, and the fold state, and it has to render in lockstep with the editor on every keystroke. Exposing all of that through a plugin API means exposing nearly the entire editor view as a public contract — the most expensive possible API surface, for one feature. In practice a minimap is a CodeMirror view extension (`@replit/codemirror-minimap` and similar exist), meaning it plugs into CodeMirror's extension system, not into an Anvil plugin system.

**So: the minimap is a deferred core feature, not a plugin.** When you want it, the shape is:

- add a `"minimap": false` setting;
- add a `view.toggle_minimap` command;
- reconfigure the CodeMirror extension when the setting changes;
- style it with the theme's CSS variables.

That's a small, self-contained change against this architecture — a good v1.1 candidate. The general lesson: features needing deep editor-internals access belong in core behind a setting. Plugins are the right shape for things that *compose* existing commands — a custom formatter, a project-specific snippet set, an extra palette action.