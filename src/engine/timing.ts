import type { When } from '#shared/director'

/** How far past the scheduler's query frontier a launch must be to be heard in full (in cycles). */
export const LAUNCH_MARGIN = 0.05

export interface TargetResult {
  /** Cycle (bar) the move will land on. */
  target: number
  /** True when the requested bar had already passed and the move slid to the next bar. */
  late: boolean
  /** The bar that was asked for (in_bars only). */
  wanted?: number
}

/**
 * Turn a move's `when` into the bar it lands on.
 * `requestCycle` is where the playhead was when the director gave the direction, so "in 8 bars" means
 * 8 bars from when it was said, not from when Claude answered. `frontier` is the earliest cycle that can
 * still be scheduled (the scheduler queries slightly ahead of the audio).
 */
export const resolveTarget = (opts: {
  when: When
  requestCycle: number
  frontier: number
  phraseBars: number
  started: boolean
}): TargetResult | null => {
  const { when, requestCycle, frontier, phraseBars, started } = opts
  if (when.type === 'manual') return null
  if (!started) return { target: 0, late: false }
  const earliest = frontier + LAUNCH_MARGIN
  const nextBar = Math.ceil(earliest)
  if (when.type === 'next_bar') return { target: nextBar, late: false }
  if (when.type === 'next_phrase')
    return { target: Math.ceil(earliest / phraseBars) * phraseBars, late: false }
  const wanted = Math.floor(requestCycle) + Math.max(1, Math.round(when.bars ?? phraseBars))
  if (wanted >= earliest) return { target: wanted, late: false }
  return { target: nextBar, late: true, wanted }
}

/** The bar a move was meant for, counted from when the direction was given (ignores Claude's latency). */
const idealBar = (opts: { when: When; requestCycle: number; phraseBars: number }) => {
  const { when, requestCycle, phraseBars } = opts
  if (when.type === 'in_bars')
    return Math.floor(requestCycle) + Math.max(1, Math.round(when.bars ?? phraseBars))
  if (when.type === 'next_phrase') return Math.ceil((requestCycle + LAUNCH_MARGIN) / phraseBars) * phraseBars
  return Math.floor(requestCycle) + 1
}

/**
 * Targets for the auto-launched moves of one reply, in order. A reply is a little arrangement ("build, then
 * drop in 8 bars"), so its moves always land in order on distinct bars. When Claude answers too late for a
 * move's bar, that move keeps its planned distance from the move before it instead of colliding with it.
 */
export const planReply = (opts: {
  whens: When[]
  requestCycle: number
  frontier: number
  phraseBars: number
  started: boolean
}) => {
  const { whens, requestCycle, phraseBars } = opts
  let previous: { target: number; ideal: number } | undefined
  return whens.map((when) => {
    const result = resolveTarget({ ...opts, when })
    if (!result) return null
    const ideal = idealBar({ when, requestCycle, phraseBars })
    if (previous && result.target <= previous.target) {
      const target = previous.target + Math.max(1, ideal - previous.ideal)
      Object.assign(result, { target, late: true, wanted: result.wanted ?? ideal })
    }
    previous = { target: result.target, ideal }
    return result
  })
}
