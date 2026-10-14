# Claude Strudel

**Direct a live set in plain English.** You talk (or type) the vibe, and Claude writes and evolves [Strudel](https://strudel.cc) code that lands on the bar.

> "classic jungle tune, dark, heavy bassline" → "build it up, more hats, more snare reverb" → "drop in 8 bars, key change, darker"

You're the director, Claude is the live coder, and Strudel is the band.

🚧 Work in progress. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Quick start

Requires Node `^22.18 || ^24.11 || >=26`.

```bash
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY (and DEEPGRAM_API_KEY for voice)
npm run dev            # http://localhost:5173 - app + Worker API in one process
```

## Stack

- **[Vite+](https://viteplus.dev)** (`vp`): dev server, build (Rolldown), lint (Oxlint), format (Oxfmt), tests (Vitest)
- **Vue 3 + Pinia + Tailwind 4** for the stage UI
- **Strudel 1.2.6** packages, running in the browser
- **Cloudflare Worker** (via `@cloudflare/vite-plugin`) serving the SPA, the Claude streaming proxy and the Deepgram voice proxy
- **Claude Opus 5.5** via the Anthropic API

## Scripts

| Script                                       | What it does                                                        |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                                | Vite dev server + Worker in workerd, HMR for both                   |
| `npm run verify`                             | Everything CI runs: `vp check`, `vue-tsc -b`, `vp test`, `vp build` |
| `npm run build:staging` / `build:production` | Build for a wrangler env (`CLOUDFLARE_ENV`)                         |
| `npm run reference`                          | Regenerate Claude's Strudel function reference                      |

## Deploying (Cloudflare)

GitHub Actions does it, and it's off until you switch it on:

1. Create a Cloudflare API token with **Workers Scripts: Edit** and **Account Settings: Read**.
2. Add the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Set the Worker secrets once per environment:
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY --env staging
   npx wrangler secret put DEEPGRAM_API_KEY --env staging
   npx wrangler secret put APP_PASSWORD --env staging   # recommended: gates /api/*
   ```
4. Add the repo variable `DEPLOY_ENABLED = true`.

After that, every push to `main` deploys **staging**. **Production** is a manual "Run workflow" on _Deploy production_, which fast-forwards `releases/production` to `main` and then deploys.

## Licence

AGPL-3.0-or-later, same as Strudel, which this app bundles. Strudel is by the [uzu / TidalCycles community](https://codeberg.org/uzu/strudel). Please respect their [stance on AI](https://strudel.cc/faq): this project only uses the public docs and function reference as prompt context. It doesn't train on anyone's tunes.
