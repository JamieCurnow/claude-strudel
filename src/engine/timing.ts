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
