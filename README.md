# 1999 App Suite

A monorepo of small, focused desktop apps built with Tauri + SvelteKit.

No ads, no subscriptions, no cloud, no telemetry. One-time purchase. If a feature
needs a tutorial, it's too complicated.

## Apps

| App | What it is | Docs |
|---|---|---|
| [`anvil`](apps/anvil) | A Sublime Text-inspired code editor | [PRD](docs/anvil-v1-prd.md) · [Progress log](docs/anvil-progress.md) |

## Quick start

**Prerequisites**

- Node 20+ and [Yarn](https://yarnpkg.com/) (this repo uses Yarn workspaces — never npm or pnpm)
- Rust, via [rustup](https://rustup.rs/):
  ```sh
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```
- Linux only — Tauri's system dependencies:
  ```sh
  sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel -y
  sudo dnf group install c-development -y   # or: sudo dnf group install "Development Tools" -y
  ```
  (macOS just needs Xcode Command Line Tools: `xcode-select --install`.)

**Install and run**

```sh
yarn install
yarn workspace anvil tauri dev
```

That opens Anvil in a dev window with hot reload. Other useful commands, run from
the repo root:

```sh
yarn workspace <app> tauri dev     # run an app in dev
yarn workspace <app> tauri build   # production build
yarn workspace <app> test          # Vitest (frontend)
cd apps/<app>/src-tauri && cargo test   # Rust tests
```

## Layout

```
apps/       # one directory per app, each a Tauri + SvelteKit app
packages/   # shared code — only exists once a second app needs it
docs/       # PRDs and progress logs
```

See [`CLAUDE.md`](CLAUDE.md) for conventions (Svelte 5 runes, Sass, package
management rules, etc.) followed across the suite.
