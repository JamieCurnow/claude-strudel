# Architecture

```
 you (voice / typing)
   │  hold Space ──► mic (16 kHz PCM) ──► /api/voice (Worker) ──► Deepgram Nova-3
   │                                       transcript ◄──────────────┘
   ▼
 director store ── quick command? ("go", "undo", "mute hats") ──► deck, instantly
   │ else
   │ builds a user turn: <direction> <context> <current_code> <results>
   ▼
 /api/direct (Worker) ──► Claude (structured output: { say, moves[], ideas[] })
   │  NDJSON stream of raw events ──► BetaMessageStream in the browser (code types into the cue card)
   ▼
 moves ──► full program (full mode, or blocks merged onto the basis) ──► engine.compile (validate)
   │  all valid? (else one automatic repair turn with the exact errors)
   ▼
 deck: cue per move ──► resolveTarget(when) ──► engine.schedule(pattern, atCycle)
   │                                              │
   │                                              ▼
   │                              timeline: segments composed into one pattern,
   │                              each query split at segment boundaries ──► Strudel scheduler ──► WebAudio
   ▼
 ideas (2-3 suggested next directions) ──► background forks of the conversation ──► greyed cues, GO to play
```

## Modules

| Path                                      | Role                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/engine/engine.ts`                    | Strudel repl wrapper. `compile()` evaluates code with the result captured in the repl's `editPattern` hook, so nothing plays until it's scheduled. Validates (query 4 bars, unknown sounds, density) and preloads samples. `schedule()` / `cancel()` manage the timeline; emits `landed`. |
| `src/engine/timeline.ts`                  | Composes `[{ id, from, start, pattern }]` into one pattern. Splits query spans at boundaries, so changes are sample-accurate and notes don't retrigger. Passes `_moveStart` to queries and tags haps with `moveId`.                                                                       |
| `src/engine/helpers.ts`                   | Move-relative helpers in the eval scope: `rise`, `fall`, `afterBars`, `forBars`, `betweenBars`, `riser`, `snareRoll`, `moveBars`.                                                                                                                                                         |
| `src/engine/timing.ts`                    | `when` → target bar. `in_bars` counts from the bar the direction was _given_ on. A late move slides to the next bar and is flagged.                                                                                                                                                       |
| `src/engine/program.ts`                   | Text helpers: tempo extraction, block parsing/printing, block merging (blocks mode), mute, line diff.                                                                                                                                                                                     |
| `src/stores/deck.ts`                      | Cues and their lifecycle (generating → ready/queued → live → played; idea; failed), launch/GO/recall/undo/cancel. Keeps the `<results>` lines for Claude.                                                                                                                                 |
| `src/stores/director.ts`                  | The conversation (append-only), the direction queue, streaming, materialising moves, the repair loop, idea forks, quick commands.                                                                                                                                                         |
| `src/stores/voice.ts`, `src/voice/mic.ts` | Hold-to-talk capture and the Deepgram socket (key terms include the current block names).                                                                                                                                                                                                 |
| `src/components/*`                        | Stage UI: code view with live token highlighting, cue stack, direction bar with GO, visual layer (scope/spectrum/pianoroll/punchcard/spiral/Hydra), settings + latency stats.                                                                                                             |
| `worker/claude.ts`                        | Claude proxy: model/effort/fast allow-list, structured output schema, 1h prompt caching, refusal fallbacks, thinking `drop_block` binding, fast-mode 429 fallback.                                                                                                                        |
| `worker/voice.ts`                         | Deepgram WebSocket proxy (Blob frames are converted to bytes in order).                                                                                                                                                                                                                   |
| `worker/prompt/`                          | The system prompt: `guide.md`, `styles/*.md`, and `generated/` (sound list + function reference). Every `strudel` code block is compile-tested.                                                                                                                                           |
| `shared/`                                 | The director protocol (schema, edit-mode line) and sound bank list, shared by the app, the Worker and scripts.                                                                                                                                                                            |

## Invariants

- **Append-only conversation.** Never edit or remove earlier turns, and never change the system prompt mid-set. Thinking blocks are bound to their exact prefix, and the prompt cache depends on it too. Anything that varies per request goes in the user turn (e.g. the edit mode line). The Worker also sends `prefix_mismatch_behavior: "drop_block"`, so a prompt change from a deploy degrades gracefully instead of 400ing.
- **One `@strudel/core`.** Import the individual `@strudel/*` packages at the same version, never `@strudel/web`'s prebuilt bundle (two copies of `Pattern` break everything).
- **Tempo is the app's.** `setcpm`/`setcps` are stripped from code. A move's `bpm` applies when the scheduler's query window reaches its bar.
- **1 cycle = 1 bar.** Patterns run on absolute cycles, so loops stay in phase across moves. Only the helpers count from the landing bar.
- **Replies are atomic.** Every move in a reply must validate before any of them launches, so a repair can resend the whole reply.

## Testing

- `vp test`: engine maths (bar-exact switching, no retrigger, helpers, timing), program parsing, quick commands, and every prompt example compiled headlessly against the real sound list.
- Manual: `npm run dev`, then in the browser console `__show` exposes `{ engine, deck, director, voice, visuals, clock }` (dev builds only).
