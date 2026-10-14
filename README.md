# Claude Strudel

**Direct a live set in plain English.** Talk (or type) the vibe, and Claude writes and evolves [Strudel](https://strudel.cc) code that lands on the bar.

> "classic jungle tune, dark, heavy bassline" → "build it up, more hats, more snare reverb" → "drop in 8 bars, key change, darker"

You're the director, Claude is the live coder, and Strudel is the band.

## How it plays

- **Every direction becomes a cue** on a theatre-style cue stack.
  - Cues land **on the bar**, quantised to when you said it: "drop in 8 bars" means 8 bars from when you spoke, however long Claude takes.
  - "Now" means the next bar.
  - Bigger changes land on the next phrase.
- **Auto or Arm.** In Auto, cues launch when they're due. In Arm, every cue waits for you to hit **GO**. "Have a drop ready" arms a cue in either mode.
- **Ideas, written ahead.** With each reply, Claude suggests 2-3 next moves and the app writes them in the background. They sit greyed out on the deck, and **1-3** or GO plays one instantly. Giving a new direction replaces them.
- **History you can jump back to.** Any past cue can be played again ("back to the drop"), and **Cmd-Z** recalls the previous cue. Claude remembers the whole set, so "the hats from the first track" works.
- **Quick commands skip Claude** and happen instantly: `go`, `undo`, `stop`, `start`, `cancel`, `mute the hats`, `unmute bass and pad`, `idea two`.
- **Claude directs the stage too.** It sets the background and accent colours, big overlay text, a visualiser (scope, spectrum, pianoroll, punchcard, spiral) or a live **Hydra** sketch, all landing on the same bar as the music.
- **Code on show.** The live program fills the stage, and each mini-notation token lights up as it plays.

### Keys

| Key                | Does                                               |
| ------------------ | -------------------------------------------------- |
| hold **Space**     | Talk (release to send)                             |
| **Enter** or **/** | Type a direction                                   |
| **G**              | GO: launch the next armed cue (or the first idea)  |
| **1-3**            | Play an idea                                       |
| **Cmd/Ctrl-Z**     | Undo (recall the previous cue)                     |
| **Esc**            | Stop Claude mid-reply, or hold the last queued cue |
| **S**              | Stage view (hides the controls, for a projector)   |

### Settings worth playing with

- **Edit mode: Blocks vs Full.**
  - **Blocks** (the default): Claude sends only the parts it changes, which is faster.
  - **Full**: Claude rewrites the whole program every time.
  - The latency table in Settings compares them on your actual set. In testing, a small change in Blocks mode took ~6s and a whole new track took ~15-18s.
- **Model and effort.** The default is Opus 5.5 at low effort. Sonnet 5.5 and Haiku 5.5 are there to trade quality for speed.
- **Fast mode** runs Opus about 2.5× quicker at 2× the price. It needs fast-mode quota on your Anthropic org, and falls back to normal speed automatically if you don't have it.
- **Phrase length** (4/8/16 bars), what GO lands on, how many ideas to write ahead, and auto-repair.

## Quick start

Requires Node `^22.18 || ^24.11 || >=26`.

```bash
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY (and DEEPGRAM_API_KEY for voice)
npm run dev            # http://localhost:5173: app + Worker API in one process
```

Use a headset or close mic for voice. Hold-to-talk plus echo cancellation copes with laptop speakers, but a PA will bleed into an open mic.

## Stack

- **[Vite+](https://viteplus.dev)** (`vp`): dev server, build (Rolldown), lint (Oxlint, type-aware), format (Oxfmt) and tests (Vitest)
- **Vue 3 + Pinia + Tailwind 4** for the stage UI
- **Strudel 1.2.6** packages running in the browser, plus Hydra for visuals
- **Cloudflare Worker** (via `@cloudflare/vite-plugin`) serving the SPA, the Claude streaming proxy and the Deepgram voice proxy
- **Claude Opus 5.5** via the Anthropic API, with structured outputs, 1h prompt caching and refusal fallbacks
- **Deepgram Nova-3** streaming speech-to-text, with music key terms

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together and [docs/ROADMAP.md](docs/ROADMAP.md) for what's next.

## Scripts

| Script                                       | What it does                                                        |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                                | Vite dev server + Worker in workerd, HMR for both                   |
| `npm run verify`                             | Everything CI runs: `vp check`, `vue-tsc -b`, `vp test`, `vp build` |
| `npm run build:staging` / `build:production` | Build for a wrangler env (`CLOUDFLARE_ENV`)                         |
| `npm run reference`                          | Regenerate Claude's Strudel function reference + sound list         |

## Deploying (Cloudflare)

GitHub Actions does it, and it's off until you switch it on:

1. Create a Cloudflare API token with **Workers Scripts: Edit** and **Account Settings: Read**.
2. Add the repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. Set the Worker secrets once per environment:
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY --env staging
   npx wrangler secret put DEEPGRAM_API_KEY --env staging
   npx wrangler secret put APP_PASSWORD --env staging   # recommended: gates /api/* (enter it in Settings)
   ```
4. Add the repo variable `DEPLOY_ENABLED = true`.

After that, every push to `main` deploys **staging** (`claude-strudel-staging.<you>.workers.dev`). **Production** is a manual "Run workflow" on _Deploy production_, which fast-forwards `releases/production` to `main` and then deploys.

## Licence

AGPL-3.0-or-later, same as Strudel, which this app bundles. Strudel is by the [uzu / TidalCycles community](https://codeberg.org/uzu/strudel). Please respect their [stance on AI](https://strudel.cc/faq): this project only uses the public docs and function reference as prompt context. It doesn't train on anyone's tunes. The sample banks are loaded at runtime from their public sources, and some don't carry a licence, so self-host cleared samples for paid gigs.
