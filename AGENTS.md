# Agent notes

StrudelClaw: a Vue SPA + one Cloudflare Worker. Read `docs/ARCHITECTURE.md` before changing the engine or the director.

## Commands

- `npm run dev` - `vp dev`: Vite dev server with the Worker running inside workerd (one process, HMR for both).
- `npm run verify` - everything CI runs: `vp check` (oxfmt + oxlint + type-aware checks), `vue-tsc -b`, `vp test`, `vp build`.
- `npm run reference` - regenerate the Strudel function reference fed to Claude (`worker/prompt/generated/`).

## Code style

- Formatting is Oxfmt via `vp fmt` (no semicolons, single quotes, 110 cols). Run `vp check --fix`.
- Functions with more than one argument take a single options object: `fn({ a, b })`.
- Prefer type inference over explicit return types. One-line `if` when it fits.
- Log objects, not strings: `console.log({ move })`.

## Stack rules

- Worker secrets come from `env` (never `process.env`). Local values live in `.env` (gitignored).
- Only one copy of `@strudel/core` may exist in the bundle - import from the individual `@strudel/*` packages, never `@strudel/web` or `@strudel/repl`.
- Claude requests must stay append-only (never edit earlier turns): prompt caching and preserved thinking both depend on it.
