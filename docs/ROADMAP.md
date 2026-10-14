# Roadmap

Claude Strudel lets you direct a live set in plain English, by voice or by typing. Claude writes and evolves the [Strudel](https://strudel.cc) code, and every change lands on the bar, timed against the music. You're the director: "classic jungle tune, dark, heavy bassline" … "build it up, more hats, more snare reverb" … "drop in 8 bars, key change, darker".

## What we learned from the research (Oct 2026)

- **Nothing does all of this yet.** The closest projects:
  - **VibeRave:** voice to an LLM to Strudel, hot-swapped on the next cycle.
  - **DJ Claude:** an autonomous Claude DJ that plays a pre-planned arc.
  - **oddeNova:** a validate-then-commit agent loop.
  - **strudel-mcp-server:** MCP tools around strudel.cc.

  None of them is directed live with a sense of musical time: "in 8 bars", queued and armed moves, jumping back to an earlier state, or ideas generated ahead of time.

- **LLM pitfalls seen in that work:**
  - made-up function and sample names
  - code that runs but sounds wrong
  - layers piling up until the browser chokes
  - Claude drifting to slow, dark ambient music unless a style pack anchors it
- **How Strudel behaves** (checked against the 1.2.6 source):
  - `evaluate()` swaps the pattern straight away and keeps the clock running. Nothing in Strudel quantises changes to bars, so we do it ourselves.
  - A compile error keeps the old pattern playing.
  - An error while the pattern plays is only logged, and that layer goes silent.
  - Every pattern passes through the repl's `editPattern` hook before it's scheduled. We use that hook to compose a timeline and land each change exactly on its target cycle.

## Decisions

| Area           | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack          | **Vite+ 1.2** (`vp`: Vite 8/Rolldown, Oxlint, Oxfmt, Vitest 5), **Vue 3 + Pinia + Tailwind 4**. One **Cloudflare Worker** serves the SPA and the `/api/*` routes via `@cloudflare/vite-plugin`, so `vp dev` runs the app and the Worker (in workerd) in one process.                                                                                                                                                                              |
| Strudel        | Individual `@strudel/*` 1.2.6 packages (core, mini, tonal, transpiler, webaudio, draw, hydra, soundfonts) rather than `@strudel/web`, so there's only one copy of `@strudel/core`.                                                                                                                                                                                                                                                                |
| Claude         | **Claude Opus 5.5** by default, with effort `low` because latency matters. The app streams responses through the Worker and constrains them with structured outputs (JSON schema). The system prompt (guide, style packs, generated function reference) and the conversation are prompt-cached. Server-side refusal fallbacks are on (`fallbacks: "default"`). Toggles: model (Opus 5.5 / Sonnet 5.5 / Haiku 5.5), effort, fast mode (Opus only). |
| Edit mode      | **Toggle between both:** **Full**, where Claude gets the whole program and returns the whole new program, and **Blocks**, where Claude returns only the named blocks it changes and the app merges them. Every move records its latency, output tokens and validation result, and a stats panel compares the two.                                                                                                                                 |
| Chat history   | **Kept.** The conversation (your directions, Claude's moves with their code, and launch results) is sent in full every time. Each request only adds to the end, so the prompt cache stays warm. That's how "back to the jungle hats from the first track" works. Server-side compaction (beta) kicks in for very long sets.                                                                                                                       |
| Timing         | Every Claude response becomes one or more **moves** with a `when`: `next_bar`, `next_phrase`, `in_bars: N` (counted from **when you spoke**, not from when Claude answered) or `manual` (armed, waiting for GO). If a move arrives too late for its target, it slides to the next bar and is flagged "late". Launch mode toggle: **Auto** follows `when`; **Arm** puts every move in "Ready" until you hit it.                                    |
| The deck       | One timeline column: **History** (click any card to jump back to that state), **Now**, **Queued** (countdown in bars), **Ready** (hit GO or a number key), **Ideas** (greyed, pre-generated). Typing or saying a new instruction replaces the ideas.                                                                                                                                                                                              |
| Pre-generation | Every response also suggests 2-3 short next-move ideas. With the toggle on (default: 2), the app generates them in the background as forks of the conversation, so launching one is instant. If you pick one, its fork is appended to the main conversation.                                                                                                                                                                                      |
| Voice          | Hold-to-talk (Space or the mic button), **Deepgram Nova-3** streaming with key terms (amen, reese, hats, lpf, plus your current block names). The browser connects to a Worker WebSocket proxy, so the Deepgram key never reaches the client. Typing works the same way. Quick commands skip Claude and are instant: `go`, `undo`, `stop`, `mute/unmute X`, `cancel`.                                                                             |
| Visuals        | Claude can direct the stage too: background colour or gradient, accent colour, big overlay text, a Strudel visualiser (scope, pianoroll, spiral, punchcard) or a **Hydra** sketch. Visuals ride on the same moves and land on the same bar as the music.                                                                                                                                                                                          |
| Safety gate    | Before a move can queue: transpile, evaluate in dry-run mode (captured in `editPattern`, never scheduled), query the next 8 cycles, check every sound name against the loaded banks, and cap events per cycle. If any check fails, Claude gets one automatic repair attempt with the exact error, and the music never stops.                                                                                                                      |
| Licence        | AGPL-3.0-or-later (we bundle Strudel). The repo is public.                                                                                                                                                                                                                                                                                                                                                                                        |

## Milestones

### M0 - Scaffold ✅

- [x] Vite+ + Vue + Tailwind + Cloudflare Worker, one `vp dev` for app and API
- [x] CI: `vp check`, `vue-tsc`, `vp test`, `vp build`, `wrangler deploy --dry-run` on every PR
- [x] Staging deploy on push to main, manual production deploy with a `releases/production` branch (gated on `DEPLOY_ENABLED`)

### M1 - Engine

- [ ] Strudel boot: prebake the strudel.cc sound banks + dirt-samples breaks
- [ ] Musical clock: bar, beat and phrase from the scheduler, BPM managed outside the code (`setcpm` stripped and applied on the bar)
- [ ] Timeline composer: segments `[{ fromCycle, pattern }]` composed into one pattern, so changes land exactly on their bar, with old segments pruned
- [ ] Dry-run validator (compile, query, unknown sounds, event budget)
- [ ] Code view with live highlighting of active events

### M2 - Director (Claude)

- [ ] Worker `/api/direct`: streams Claude with the cached system prompt, a structured-output schema per edit mode, refusal fallbacks, effort/model/fast-mode settings, and compaction
- [ ] System prompt: house conventions (labelled blocks, `_` to mute, master `all()`), sound list, jungle/dnb/techno/house/ambient style packs, a helper library for builds (ramps, risers, rolls), and a generated function reference from `@strudel/reference`
- [ ] Conversation store (append-only, saved locally) and move parsing from partial JSON while streaming (the code types out on stage)
- [ ] Full / Blocks edit modes plus latency and accuracy stats
- [ ] Automatic repair loop using the exact validation error

### M3 - Deck & timing

- [ ] Move lifecycle: generating → ready / queued → playing → history (or failed / late)
- [ ] `when` resolved against the bar you spoke on; Auto / Arm launch modes; GO, cancel and jump-back
- [ ] Phrase length setting (4/8/16), bar and phrase ring on the transport
- [ ] Hotkeys: Space (talk), Enter (send), G (go), Esc (cancel queued), 1-9 (launch idea), Cmd-Z (undo)

### M4 - Voice

- [ ] Worker WebSocket proxy to Deepgram (`/api/voice`)
- [ ] Hold-to-talk capture (AudioWorklet → 16 kHz linear16), interim transcript, key terms
- [ ] Quick commands that skip Claude

### M5 - Visuals

- [ ] Stage layer: background, accent, overlay text, Strudel visualisers
- [ ] Hydra sketches written by Claude, validated, and landed on the bar
- [ ] Stage mode (hide the chrome for a projector)

### M6 - Ideas (pre-generation)

- [ ] Ideas from every response, background forks (count toggle 0-3), ghost cards, instant launch, new instruction overrides

### Later

- MIDI controller: knobs bound to `slider()`/`cc()` values Claude is told not to touch; footswitch for talk/GO
- Session export/import (a set as JSON / `.strudel`), share links
- Eval set of directions plus scoring, to tune prompts against (hats count up, key changed, etc.)
- Self-hosted sample packs for gigs (licence-clean)
- Multiplayer: a second performer or the audience suggests, the director approves
