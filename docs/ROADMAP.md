# Roadmap

StrudelClaw lets you direct a live set in plain English, by voice or by typing. Claude writes and evolves the [Strudel](https://strudel.cc) code, and every change lands on the bar, timed against the music. You're the director: "classic jungle tune, dark, heavy bassline" … "build it up, more hats, more snare reverb" … "drop in 8 bars, key change, darker".

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

### M1: Engine ✅

- [x] Strudel boot: the strudel.cc sound banks plus dirt-samples breaks and Switch Angel breaks
- [x] Musical clock (bar, beat, phrase). BPM is managed outside the code: `setcpm` is stripped and the tempo is applied on the bar
- [x] Timeline composer: changes land exactly on their bar, and old segments are pruned
- [x] Dry-run validator (compile, query, unknown sounds, event budget) plus sample preloading
- [x] Code view with live highlighting of active events

### M2: Director (Claude) ✅

- [x] Worker `/api/direct`: streaming, a structured-output schema per edit mode, 1h caching, refusal fallbacks, model/effort/fast-mode settings, `drop_block` thinking binding
- [x] System prompt: guide, 7 tested style packs, helper library, generated sound list and function reference
- [x] Append-only conversation saved locally, with code streaming into the cue card
- [x] Full / Blocks edit modes, plus a latency stats table
- [x] Automatic repair turn with the exact validation errors (verified with a simulated failure)

### M3: Deck & timing ✅

- [x] Cue lifecycle, Auto / Arm modes, GO, hold, play again, undo
- [x] `when` resolved against the bar you spoke on; late cues slide to the next bar and are flagged to Claude
- [x] Phrase length setting and a phrase ring on the transport
- [x] Hotkeys: Space, Enter, G, Esc, 1-3, Cmd-Z, S

### M4: Voice ✅

- [x] Worker WebSocket proxy to Deepgram
- [x] Hold-to-talk capture at 16 kHz, interim transcript, key terms from the current block names
- [x] Quick commands that skip Claude

### M5: Visuals ✅

- [x] Background, accent, overlay text, scope / spectrum / pianoroll / punchcard / spiral
- [x] Hydra sketches written by Claude, landed on the bar
- [x] Stage view

### M6: Ideas ✅

- [x] Ideas from every reply, background forks (0-3), greyed cues with stable hotkeys, instant launch, a new direction replaces them

### Next up

- Try a real set and tune: the prompt (taste, levels), the default edit mode, how many ideas to write ahead
- An eval set of directions (did the hats actually get busier? did the key change?) to tune prompts and pick a default model
- Undo for "cancel" when it's spoken while Claude is writing (it currently aborts the request)
- Mobile / tablet layout for a second screen (the director's remote)

### Later

- MIDI controller: knobs bound to `slider()`/`cc()` values Claude is told not to touch; footswitch for talk/GO
- Session export/import (a set as JSON / `.strudel`), share links
- Eval set of directions plus scoring, to tune prompts against (hats count up, key changed, etc.)
- Self-hosted sample packs for gigs (licence-clean)
- Multiplayer: a second performer or the audience suggests, the director approves
