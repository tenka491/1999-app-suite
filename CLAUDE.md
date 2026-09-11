# 1999 App Suite

A monorepo of small, focused desktop apps built with Tauri + SvelteKit.

Product principles: no ads, no subscriptions, no cloud, no telemetry. One-time purchase.
If a feature needs a tutorial, it's too complicated. Apps should feel instant.

<!-- Maintainer note: HTML comments are stripped before this file reaches Claude's
     context, so use them freely for notes to yourself. Verify the commands below
     once M0 exists and update them. -->

## Package management

- **Use Yarn. Never npm or pnpm.** Yarn workspaces, no Lerna.
- Install deps for one app: `yarn workspace <name> add <pkg>`
- Never add a dependency without saying why it's needed and what it replaces.
  Prefer no dependency. This project has a low tolerance for transitive bloat.

## Layout

```
apps/       # one directory per app, each a Tauri + SvelteKit app
packages/   # shared code — only create one when a second app needs it
docs/       # PRDs and progress logs (see below)
```

## Commands

Run from the repo root:

- `yarn workspace <app> tauri dev` — run an app in dev
- `yarn workspace <app> tauri build` — production build
- `yarn workspace <app> test` — Vitest (frontend)
- `cd apps/<app>/src-tauri && cargo test` — Rust tests

## Conventions

- **Svelte 5 runes** (`$state`, `$derived`, `$effect`). Do not use legacy Svelte stores.
- Shared reactive state goes in `.svelte.ts` modules.
- **Sass**, not CSS-in-JS. Each app has `src/styles/` with `app.scss`, `_tokens.scss`, `_reset.scss`.
- All colors come from CSS custom properties so themes can swap without reconfiguring components.
- Font across the suite: Red Hat Mono, bundled locally. Never load fonts from a CDN.
- Spacing base: 8px.
- **No network access in any app.** No telemetry, no analytics, no update pings, no remote assets.
  Scope Tauri capabilities to only the plugins and commands actually used.

## Working style

- Get structure right first, then refine. But do not build abstractions for features
  that aren't in the current scope — this repo has been over-engineered before and
  the scaffolding was thrown away.
- Build logic in isolation with tests before layering on visuals.
- When a spec doesn't cover a decision, pick the simplest option and flag it in your
  summary rather than inventing architecture.
- Stop at milestone boundaries for review. Don't run ahead into the next milestone.

## Reference docs

Read these on demand — they are not auto-loaded:

- `docs/anvil-v1-prd.md` — full spec for the Anvil editor (v1)
- `docs/anvil-progress.md` — what's actually been built, and deviations from the PRD

<!-- Paths above are deliberately in backticks, not @-imports. An @path would expand
     the whole 500-line PRD into context at launch on every session. -->

When starting work on a milestone, read only the PRD sections relevant to it, plus the
progress log. When finishing a milestone, append to the progress log: what was built,
where key modules live, and anything that deviated from the PRD and why.