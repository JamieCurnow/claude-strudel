// Helper functions exposed to Strudel code (added to the eval scope at boot).
//
// Every move lands on a bar the app picks at launch time, so Claude can't know absolute bar numbers when it
// writes code. These helpers measure time from the moment the move lands instead: the timeline passes the
// landing cycle to every query as the `_moveStart` control (see timeline.ts).
//
// Documented for Claude in worker/prompt/guide.md - keep the two in sync.
import { Pattern, signal } from '@strudel/core'
import type { Fraction, Hap, State } from '@strudel/core'

const moveStart = (controls: Record<string, unknown> | undefined) => {
  const start = controls?._moveStart
  return typeof start === 'number' && Number.isFinite(start) ? start : 0
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

/** Bars elapsed since this move landed, as a continuous signal (0 at the landing bar). */
export const moveBars = signal(
  (t: Fraction, controls: Record<string, unknown>) => t.valueOf() - moveStart(controls)
)

/**
 * Ramp from `from` to `to` over `bars` bars starting when the move lands, then hold `to`.
 * `curve` > 1 starts slow and finishes fast (good for builds).
 * e.g. `.lpf(rise(8, 300, 8000, 2))`, `.gain(rise(4))`
 */
export const rise = (bars = 4, from = 0, to = 1, curve = 1) =>
  signal((t: Fraction, controls: Record<string, unknown>) => {
    const x = clamp01((t.valueOf() - moveStart(controls)) / Math.max(bars, 0.0001))
    return from + (to - from) * x ** curve
  })

/** Ramp down: `fall(8, 8000, 300)`. Same as `rise` with the defaults flipped. */
export const fall = (bars = 4, from = 1, to = 0, curve = 1) => rise(bars, from, to, curve)

const hapBegin = (hap: Hap) => (hap.whole ?? hap.part).begin.valueOf()

const gateBars = (opts: { pattern: Pattern; from: number; to: number }) => {
  const { pattern, from, to } = opts
  return new Pattern((state: State) => {
    const start = moveStart(state.controls)
    return pattern.query(state).filter((hap: Hap) => {
      const t = hapBegin(hap) - start
      return t >= from && t < to
    })
  })
}

/** Only play from `bars` bars after the move lands. `afterBars(8, s("bd*4"))` = the drop, 8 bars in. */
export const afterBars = (bars: number, pattern: Pattern) => gateBars({ pattern, from: bars, to: Infinity })

/** Only play for the first `bars` bars after the move lands (builds, fills, risers). */
export const forBars = (bars: number, pattern: Pattern) => gateBars({ pattern, from: -Infinity, to: bars })

/** Play between bar `from` and bar `to` (relative to the landing bar). */
export const betweenBars = (from: number, to: number, pattern: Pattern) => gateBars({ pattern, from, to })

// Method forms: `s("bd*4").afterBars(8)`. Plain prototype methods (not `register`) so the bar counts stay numbers.
const proto = Pattern.prototype as unknown as Record<string, (this: Pattern, ...args: number[]) => Pattern>
proto.afterBars = function (bars) {
  return afterBars(bars, this)
}
proto.forBars = function (bars) {
  return forBars(bars, this)
}
proto.betweenBars = function (from, to) {
  return betweenBars(from, to, this)
}

/**
 * White-noise riser over `bars` bars (filter + volume sweep up), silent afterwards.
 * Put it in its own block: `riser: riser(8)`.
 */
export const riser = (bars = 8, sound = 'white') =>
  forBars(
    bars,
    (signal(() => 0) as Pattern)
      .segment(16)
      .s(sound)
      .gain(rise(bars, 0, 0.45, 2))
      .hpf(rise(bars, 300, 9000, 2))
      .decay(0.09)
      .sustain(0)
  )

/**
 * Snare roll that doubles in speed every bar for `bars` bars (4ths, 8ths, 16ths, 32nds...), then stops.
 * `roll: snareRoll(4, "sd").room(.4)`
 */
export const snareRoll = (bars = 4, sound = 'sd') =>
  forBars(
    bars,
    (signal(() => 0) as Pattern)
      .segment(moveBars.fmap((b: number) => 4 * 2 ** Math.min(3, Math.max(0, Math.floor(b)))).segment(1))
      .s(sound)
      .gain(rise(bars, 0.5, 1))
  )
