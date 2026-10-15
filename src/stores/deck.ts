import { defineStore } from 'pinia'
import { computed, markRaw, ref, watch } from 'vue'
import type { Pattern } from '@strudel/core'
import type { ChatMessage, Visuals, When } from '#shared/director'
import { engine, type CompileResult } from '@/engine/engine'
import { resolveTarget, type TargetResult } from '@/engine/timing'
import { useClock } from './clock'
import { useSettings, type Quantize } from './settings'
import { useVisuals } from './visuals'

/**
 * A cue is one move on the deck: a complete program (plus tempo + visuals) that can be launched on a bar.
 *
 *   generating -> ready (armed, waits for GO) | queued (has a target bar) -> live -> played
 *   generating -> failed (didn't validate)        idea (pre-generated, greyed) -> queued ...
 */
export type CueStatus =
  | 'generating'
  | 'idea'
  | 'ready'
  | 'queued'
  | 'live'
  | 'played'
  | 'failed'
  | 'discarded'
export type CueOrigin = 'direction' | 'idea' | 'repair' | 'recall' | 'command'

export interface CueMetrics {
  model: string
  mode: string
  ttftMs?: number
  totalMs?: number
  outputTokens?: number
  inputTokens?: number
  cacheReadTokens?: number
  repaired?: boolean
  fast?: boolean
}

export interface Cue {
  id: string
  number: number
  title: string
  summary: string
  status: CueStatus
  origin: CueOrigin
  direction: string
  /** Full program text (as Claude wrote it, after block merging). */
  code: string
  bpm: number | null
  visuals: Visuals | null
  when: When
  requestCycle: number
  targetCycle?: number
  landedCycle?: number
  /** The bar move-relative helpers (`rise`, `forBars`…) count from, set at launch. Usually the landing bar. */
  moveStart?: number
  /** Count helpers from this bar instead: a quick mute reuses its basis cue's start, so it doesn't restart a build. */
  inheritStart?: number
  late?: boolean
  errors: string[]
  warnings: string[]
  /** Streaming text while generating (raw JSON so far). */
  partial?: string
  metrics?: CueMetrics
  /** For ideas: the fork of the conversation to append if the idea is played. */
  fork?: ChatMessage[]
  /** Group id: cues from the same Claude reply. */
  replyId?: string
  /** Ideas: position in Claude's suggestion list (keeps hotkeys 1-3 stable while ideas finish writing). */
  slot?: number
  /** Set while this cue is going back on as an undo: the cue it replaces, dropped from the stack when this lands. */
  undoes?: string
  createdAt: number
}

interface Compiled {
  pattern: Pattern
  code: string
  bpm?: number
}

const KEY = 'claude-strudel:deck'
let counter = 0
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`

export const useDeck = defineStore('deck', () => {
  const cues = ref<Cue[]>([])
  const compiled = new Map<string, Compiled>()
  /** Things that happened since Claude last heard from us (reported in the next <results>). */
  const results = ref<string[]>([])
  const clock = useClock()
  const { settings } = useSettings()
  const visuals = useVisuals()
  let nextNumber = 1

  // Persist the deck (not compiled patterns) so a reload doesn't lose the set.
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as {
      cues: Cue[]
      nextNumber: number
    } | null
    if (saved?.cues) {
      cues.value = saved.cues.map((cue) =>
        ['live', 'queued'].includes(cue.status) ? { ...cue, status: 'played' as const } : cue
      )
      cues.value = cues.value.filter((cue) => !['generating', 'idea'].includes(cue.status))
      nextNumber = saved.nextNumber
    }
  } catch {}
  watch(
    cues,
    (value) => {
      try {
        const slim = value.map(({ fork: _fork, partial: _partial, ...cue }) => cue)
        localStorage.setItem(KEY, JSON.stringify({ cues: slim, nextNumber }))
      } catch {}
    },
    { deep: true }
  )

  const byStatus = (status: CueStatus) => computed(() => cues.value.filter((cue) => cue.status === status))
  const history = byStatus('played')
  const live = computed(() => cues.value.find((cue) => cue.status === 'live'))
  const queued = computed(() =>
    cues.value
      .filter((cue) => cue.status === 'queued')
      .sort((a, b) => (a.targetCycle ?? 0) - (b.targetCycle ?? 0))
  )
  const ready = byStatus('ready')
  const ideas = computed(() =>
    cues.value.filter((cue) => cue.status === 'idea').sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
  )
  const generating = byStatus('generating')
  const failed = byStatus('failed')

  /** The program a new move builds on: the last queued move if any, otherwise what's playing. */
  const basis = computed(() => queued.value.at(-1) ?? live.value)

  const find = (id: string) => cues.value.find((cue) => cue.id === id)

  const report = (line: string) => results.value.push(line)
  const takeResults = () => results.value.splice(0)

  const create = (input: Partial<Cue> & Pick<Cue, 'title' | 'origin' | 'direction' | 'when'>) => {
    const cue: Cue = {
      id: newId(),
      number: input.status === 'idea' || input.status === 'generating' ? 0 : nextNumber++,
      summary: '',
      status: 'generating',
      code: '',
      bpm: null,
      visuals: null,
      requestCycle: engine.position(),
      errors: [],
      warnings: [],
      createdAt: Date.now(),
      ...input
    }
    cues.value.push(cue)
    return find(cue.id)!
  }

  const update = (id: string, patch: Partial<Cue>) => {
    const cue = find(id)
    if (cue) Object.assign(cue, patch)
    return cue
  }

  const remove = (id: string) => {
    cues.value = cues.value.filter((cue) => cue.id !== id)
    compiled.delete(id)
  }

  /** Compile (or reuse) a cue's program. */
  const compile = async (cue: Cue): Promise<CompileResult> => {
    const result = await engine.compile(cue.code)
    if (result.ok && result.pattern) {
      compiled.set(cue.id, markRaw({ pattern: result.pattern, code: result.code, bpm: result.bpm }))
    }
    return result
  }

  const ensureCompiled = async (cue: Cue) => {
    const existing = compiled.get(cue.id)
    if (existing) return existing
    const result = await compile(cue)
    if (!result.ok) throw new Error(result.errors.join('; '))
    return compiled.get(cue.id)!
  }

  /** Code as evaluated (tempo stripped) for a cue - this is what highlighting locations refer to. */
  const evaluatedCode = (id: string) => compiled.get(id)?.code

  /** Give a cue a deck number when it becomes a real cue (ideas and generating cues don't have one). */
  const number = (cue: Cue) => {
    if (!cue.number) cue.number = nextNumber++
  }

  /** Off the timeline: back to armed, or back into history if it was an undo. */
  const unqueue = (cue: Cue) =>
    Object.assign(cue, {
      status: cue.undoes ? 'played' : 'ready',
      targetCycle: undefined,
      undoes: undefined
    })

  /**
   * Put a cue on the timeline. `when` defaults to the cue's own `when` (auto launch); `target` is a bar
   * already planned for it (a reply's moves are planned together, see planReply).
   */
  const launch = async (
    id: string,
    opts: { quantize?: Quantize; when?: When; target?: TargetResult | null } = {}
  ) => {
    const cue = find(id)
    if (!cue) return
    const when = opts.quantize ? { type: opts.quantize, bars: null } : (opts.when ?? cue.when)
    const target =
      opts.target !== undefined
        ? opts.target
        : resolveTarget({
            when,
            requestCycle: cue.requestCycle,
            frontier: clock.frontier(),
            phraseBars: settings.phraseBars,
            started: engine.started
          })
    if (!target) {
      cue.status = 'ready'
      number(cue)
      return
    }
    const { pattern, bpm: codeBpm } = await ensureCompiled(cue)
    // Anything else already queued for the same bar is replaced by this cue.
    for (const other of queued.value) {
      if (other.id !== cue.id && other.targetCycle === target.target) unqueue(other)
    }
    number(cue)
    const moveStart = cue.inheritStart ?? target.target
    Object.assign(cue, { status: 'queued', targetCycle: target.target, late: target.late, moveStart })
    if (target.late)
      report(
        `#${cue.number} "${cue.title}" was late: asked for bar ${target.wanted}, lands bar ${target.target}`
      )
    await engine.schedule({ id: cue.id, pattern, atCycle: target.target, bpm: cue.bpm ?? codeBpm, moveStart })
    if (!engine.started) await engine.start()
  }

  /**
   * The cue GO fires: the first armed cue of the latest reply that has any (so a reply's build fires before
   * its drop, and what you just asked for beats something armed long ago), else the first idea.
   */
  const nextUp = computed(() => {
    const latest = ready.value.at(-1)
    if (!latest) return ideas.value.find((cue) => cue.code)
    if (!latest.replyId) return latest
    return ready.value.find((cue) => cue.replyId === latest.replyId)
  })

  /** GO: launch the next armed cue (or the first idea if nothing is armed). */
  const go = async () => {
    const next = nextUp.value
    if (!next) return
    if (next.status === 'idea') return playIdea(next.id)
    await launch(next.id, { quantize: settings.goQuantize })
  }

  /** Re-launch a past cue's program as a new cue ("back to the drop"). */
  const recall = async (id: string) => {
    const source = find(id)
    if (!source) return
    const cue = create({
      title: source.title,
      summary: `Recall of #${source.number}`,
      origin: 'recall',
      direction: `recall #${source.number}`,
      when: { type: settings.goQuantize, bars: null },
      code: source.code,
      bpm: source.bpm,
      visuals: source.visuals,
      status: 'ready'
    })
    number(cue)
    const existing = compiled.get(source.id)
    if (existing) compiled.set(cue.id, existing)
    report(`director recalled #${source.number} "${source.title}" as #${cue.number}`)
    await launch(cue.id, { quantize: settings.goQuantize })
  }

  /**
   * Back a step: the cue before the live one goes back on (the same cue, not a copy) on the next bar, and the
   * live one is dropped from the stack when it lands. Undoing again before that steps back one more.
   */
  const undo = async () => {
    const pending = queued.value.find((cue) => cue.undoes)
    const current = pending ? find(pending.undoes!) : live.value
    if (pending) {
      await engine.cancel(pending.id)
      unqueue(pending)
    }
    const previous = history.value.filter((cue) => cue !== pending).at(-1)
    if (!previous) return
    Object.assign(previous, { undoes: current?.id, inheritStart: undefined })
    if (current) report(`director undid #${current.number} "${current.title}", back to #${previous.number}`)
    await launch(previous.id, { quantize: 'next_bar' })
  }

  /** Take a queued cue off the timeline (it goes back to armed). */
  const cancel = async (id: string) => {
    const cue = find(id)
    if (!cue || cue.status !== 'queued') return
    await engine.cancel(id)
    unqueue(cue)
    report(`director cancelled #${cue.number} "${cue.title}"`)
  }

  /** Discard an armed/failed cue. */
  const discard = async (id: string) => {
    const cue = find(id)
    if (!cue) return
    if (cue.status === 'queued') await engine.cancel(id)
    cue.status = 'discarded'
  }

  /** Hooks set by the director store (avoids a circular import). */
  const hooks: { onIdeaPlayed?: (cue: Cue) => void } = {}

  const playIdea = async (id: string) => {
    const cue = find(id)
    if (!cue || cue.status !== 'idea') return
    hooks.onIdeaPlayed?.(cue)
    for (const other of ideas.value) if (other.id !== id) other.status = 'discarded'
    cue.origin = 'idea'
    await launch(cue.id, { quantize: settings.goQuantize })
  }

  const clearIdeas = () => {
    for (const cue of ideas.value) cue.status = 'discarded'
    cues.value = cues.value.filter((cue) => cue.status !== 'discarded' || cue.number > 0)
  }

  engine.on((event) => {
    // Stopping resets the clock to bar 0, so queued bars no longer mean anything: re-arm them.
    if (event.type === 'stopped') {
      for (const cue of queued.value) {
        void engine.cancel(cue.id)
        unqueue(cue)
      }
      for (const cue of cues.value) cue.inheritStart = undefined
      return
    }
    if (event.type !== 'landed') return
    const cue = find(event.id)
    if (!cue) return
    for (const other of cues.value)
      if (other.status === 'live' && other.id !== cue.id) other.status = 'played'
    const undone = cue.undoes ? find(cue.undoes) : undefined
    if (undone?.status === 'played') undone.status = 'discarded'
    Object.assign(cue, { status: 'live', landedCycle: event.cycle, undoes: undefined })
    if (cue.visuals) visuals.apply(cue.visuals)
    report(`#${cue.number} "${cue.title}" landed on bar ${Math.max(0, Math.round(event.cycle))}`)
  })

  const reset = () => {
    cues.value = []
    compiled.clear()
    results.value = []
    nextNumber = 1
  }

  return {
    cues,
    results,
    history,
    live,
    queued,
    ready,
    ideas,
    generating,
    failed,
    basis,
    nextUp,
    hooks,
    find,
    create,
    update,
    remove,
    compile,
    evaluatedCode,
    launch,
    go,
    recall,
    undo,
    cancel,
    discard,
    playIdea,
    clearIdeas,
    report,
    takeResults,
    reset
  }
})
