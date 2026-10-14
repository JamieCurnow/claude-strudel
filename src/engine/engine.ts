import { evalScope, silence } from '@strudel/core'
import type { Hap, Pattern, Repl } from '@strudel/core'
import { miniAllStrings } from '@strudel/mini'
import { transpiler } from '@strudel/transpiler'
import {
  getAudioContext,
  getSampleBuffer,
  initAudioOnFirstClick,
  soundMap,
  webaudioRepl
} from '@strudel/webaudio'
import { bpmToCps, cpsToBpm, extractTempo } from './program'
import { composeTimeline, insertSegment, pruneSegments, removeSegment, type Segment } from './timeline'
import { loadSoundBanks } from './sounds'
import { tagBlocks } from './tagging'

export interface CompileResult {
  ok: boolean
  /** Code as evaluated (tempo lines removed). */
  code: string
  /** Tempo found in the code (setcpm/setcps), if any. */
  bpm?: number
  pattern?: Pattern
  errors: string[]
  warnings: string[]
  /** Sound names used in the next few bars (for display + voice keyterms). */
  sounds: string[]
  /** Labelled blocks that produced events. */
  blocks: string[]
  /** Onsets per bar over the checked window (density). */
  eventsPerBar: number
}

export interface ScheduledChange {
  id: string
  atCycle: number
  bpm?: number
}

type Listener = (event: EngineEvent) => void
export type EngineEvent =
  | { type: 'landed'; id: string; cycle: number }
  | { type: 'started' }
  | { type: 'stopped' }
  | { type: 'error'; message: string }

const MAX_EVENTS_PER_BAR = 512
const CHECK_BARS = 4

/**
 * Wraps a Strudel repl. Code is never played directly: it is compiled (evaluated with the result captured
 * in the repl's `editPattern` hook, never scheduled), validated, and then placed on a timeline so it starts
 * exactly on a bar. The repl only ever plays the composed timeline.
 */
export class Engine {
  repl!: Repl
  ready = false
  private segments: Segment[] = []
  private pendingTempo: { id: string; atCycle: number; bpm: number }[] = []
  private landed = new Set<string>()
  private capturing = false
  private captured: Pattern | undefined
  private compileQueue: Promise<unknown> = Promise.resolve()
  private listeners = new Set<Listener>()
  private ticker: ReturnType<typeof setInterval> | undefined
  private installed: Pattern = silence

  async boot(opts: { onProgress?: (message: string) => void } = {}) {
    if (this.ready) return
    const { onProgress } = opts
    void initAudioOnFirstClick()
    miniAllStrings()
    this.repl = webaudioRepl({
      transpiler,
      beforeEval: tagBlocks,
      editPattern: (pattern: Pattern) => {
        if (!this.capturing) return pattern
        this.captured = pattern
        return this.installed
      },
      onToggle: (started: boolean) => this.emit(started ? { type: 'started' } : { type: 'stopped' })
    })
    onProgress?.('Loading Strudel modules')
    await evalScope(
      evalScope,
      import('@strudel/core'),
      import('@strudel/mini'),
      import('@strudel/tonal'),
      import('@strudel/webaudio'),
      import('@strudel/draw'),
      import('./helpers')
    )
    onProgress?.('Loading sound banks')
    await loadSoundBanks({ onProgress })
    this.setBpm(170)
    this.ready = true
    this.ticker = setInterval(() => this.tick(), 20)
  }

  on(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: EngineEvent) {
    for (const listener of this.listeners) listener(event)
  }

  /** Current position in cycles (= bars). 0 when stopped. */
  now() {
    return this.repl?.scheduler.now() ?? 0
  }

  /**
   * Where the playhead is right now, for timing directions. Reads the scheduler directly rather than the
   * reactive clock (which is sampled by requestAnimationFrame and stalls when the tab is in the background).
   */
  position() {
    return this.started ? this.now() : 0
  }

  get started() {
    return !!this.repl?.scheduler.started
  }

  get bpm() {
    return cpsToBpm(this.repl?.scheduler.cps ?? 0.5)
  }

  setBpm(bpm: number) {
    this.repl.scheduler.setCps(bpmToCps(bpm))
  }

  async start() {
    await getAudioContext().resume()
    await this.repl.setPattern(this.installed, true)
  }

  stop() {
    this.repl.stop()
  }

  /** Compile + validate code without touching what is playing. Calls are serialised. */
  compile(code: string) {
    const run = this.compileQueue.then(() => this.compileNow(code))
    this.compileQueue = run.catch(() => undefined)
    return run
  }

  private async compileNow(source: string): Promise<CompileResult> {
    const { code, bpm } = extractTempo(source)
    const base = {
      code,
      bpm,
      errors: [] as string[],
      warnings: [] as string[],
      sounds: [],
      blocks: [],
      eventsPerBar: 0
    }
    if (!code.trim()) return { ...base, ok: false, errors: ['Empty program'] }
    this.capturing = true
    this.captured = undefined
    const scheduler = this.repl.scheduler
    const cps = scheduler.cps
    try {
      await this.repl.evaluate(code, false)
    } finally {
      this.capturing = false
      // Code may call setcps/setcpm in odd ways; tempo is ours, so put it back.
      if (scheduler.cps !== cps) scheduler.setCps(cps)
    }
    const pattern = this.captured as Pattern | undefined
    if (!pattern) {
      const error = this.repl.state.evalError
      return { ...base, ok: false, errors: [error?.message ?? 'Code did not produce a pattern'] }
    }
    return { ...base, ...this.check(pattern), code, bpm, pattern }
  }

  /** Query the next few bars and look for runtime errors, unknown sounds and runaway density. */
  private check(pattern: Pattern) {
    const errors: string[] = []
    const warnings: string[] = []
    const from = Math.max(0, Math.floor(this.now()))
    let haps: Hap[] = []
    try {
      haps = pattern.queryArc(from, from + CHECK_BARS).filter((hap) => hap.hasOnset())
    } catch (err) {
      errors.push(`Runtime error while playing: ${(err as Error).message}`)
    }
    const known = soundMap.get()
    const sounds = new Set<string>()
    const unknown = new Set<string>()
    const blocks = new Set<string>()
    for (const hap of haps) {
      const value = hap.value
      if (!value || typeof value !== 'object') continue
      if (typeof value._block === 'string') blocks.add(value._block)
      const name = typeof value.s === 'string' ? value.s : undefined
      if (!name) continue
      const key = (value.bank ? `${value.bank}_${name}` : name).toLowerCase()
      sounds.add(key)
      if (!known[key]) unknown.add(value.bank ? `${name} (bank ${value.bank})` : name)
    }
    if (unknown.size)
      errors.push(`Unknown sound(s): ${[...unknown].join(', ')}. Use only sounds from the sound list.`)
    const eventsPerBar = haps.length / CHECK_BARS
    if (eventsPerBar > MAX_EVENTS_PER_BAR)
      errors.push(
        `Too dense: ${Math.round(eventsPerBar)} events per bar (max ${MAX_EVENTS_PER_BAR}). Simplify.`
      )
    if (!haps.length && !errors.length) warnings.push('Silent: no events in the next bars')
    if (!errors.length) this.preload(haps)
    return { ok: !errors.length, errors, warnings, sounds: [...sounds], blocks: [...blocks], eventsPerBar }
  }

  /** Warm the sample cache so the first hit after a launch is not late. */
  private preload(haps: Hap[]) {
    const known = soundMap.get()
    const seen = new Set<string>()
    for (const hap of haps) {
      const value = hap.value
      if (!value?.s) continue
      const key = (value.bank ? `${value.bank}_${value.s}` : value.s).toLowerCase()
      const id = `${key}:${value.n ?? 0}`
      const sound = known[key]
      if (seen.has(id) || sound?.data.type !== 'sample') continue
      seen.add(id)
      getSampleBuffer({ ...value, s: key }, sound.data.samples).catch(() => undefined)
    }
  }

  /** Put a compiled pattern on the timeline from `atCycle` (use a past cycle to replace immediately). */
  async schedule(opts: { id: string; pattern: Pattern; atCycle: number; bpm?: number }) {
    const { id, pattern, atCycle, bpm } = opts
    this.landed.delete(id)
    this.pendingTempo = this.pendingTempo.filter((t) => t.id !== id)
    if (bpm) this.pendingTempo.push({ id, atCycle, bpm })
    this.segments = insertSegment(this.segments, { id, from: atCycle, start: Math.max(0, atCycle), pattern })
    await this.install()
    this.tick()
  }

  /** Remove a scheduled (not yet landed) change. */
  async cancel(id: string) {
    this.segments = removeSegment(this.segments, id)
    this.pendingTempo = this.pendingTempo.filter((t) => t.id !== id)
    await this.install()
  }

  /** Cycles of each scheduled segment, for the UI. */
  scheduled(): ScheduledChange[] {
    return this.segments.map((s) => ({
      id: s.id,
      atCycle: s.from,
      bpm: this.pendingTempo.find((t) => t.id === s.id)?.bpm
    }))
  }

  private async install() {
    this.installed = composeTimeline(this.segments).analyze(1)
    await this.repl.setPattern(this.installed, false)
  }

  private tick() {
    if (!this.ready || !this.started) return
    const now = this.now()
    const frontier = this.repl.scheduler.lastEnd
    // Tempo changes apply when the scheduler's query window reaches the bar (it runs slightly ahead of audio).
    const due = this.pendingTempo.filter((change) => frontier >= change.atCycle)
    for (const change of due) this.setBpm(change.bpm)
    if (due.length) this.pendingTempo = this.pendingTempo.filter((change) => !due.includes(change))
    for (const segment of this.segments) {
      if (this.landed.has(segment.id) || now < segment.from) continue
      this.landed.add(segment.id)
      this.emit({ type: 'landed', id: segment.id, cycle: segment.from })
    }
    const pruned = pruneSegments(this.segments, now)
    if (pruned !== this.segments) {
      this.segments = pruned
      void this.install()
    }
  }

  /** Haps around the playhead, for visualisers and code highlighting. */
  hapsAround(opts: { behind: number; ahead: number }) {
    const now = this.now()
    try {
      return { now, haps: this.installed.queryArc(Math.max(0, now - opts.behind), now + opts.ahead) }
    } catch {
      return { now, haps: [] as Hap[] }
    }
  }

  dispose() {
    clearInterval(this.ticker)
    this.repl?.stop()
  }
}

export const engine = new Engine()
