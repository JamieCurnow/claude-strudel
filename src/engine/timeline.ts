import { Fraction, Pattern, TimeSpan, silence } from '@strudel/core'
import type { Hap, State } from '@strudel/core'

export interface Segment {
  /** Move id that owns this segment. */
  id: string
  /** First cycle this segment plays from. The first segment always starts at -Infinity. */
  from: number
  /** The bar the move landed on. Passed to queries as `_moveStart` so helpers like `rise()` can count bars. */
  start: number
  pattern: Pattern
}

/**
 * Compose segments into one pattern. Each query span is split at segment boundaries and each piece is
 * answered by the segment that owns it, so a change lands exactly on its cycle (sample-accurate, no timers).
 * Haps that started before a boundary show up as fragments without an onset, so they never retrigger.
 */
export const composeTimeline = (segments: Segment[]) => {
  if (!segments.length) return silence
  return new Pattern((state: State) => {
    const begin = state.span.begin.valueOf()
    const end = state.span.end.valueOf()
    const haps: Hap[] = []
    segments.forEach((segment, i) => {
      const to = segments[i + 1]?.from ?? Infinity
      const b = Math.max(begin, segment.from)
      const e = Math.min(end, to)
      if (b >= e) return
      const span = new TimeSpan(
        b === begin ? state.span.begin : Fraction(b),
        e === end ? state.span.end : Fraction(e)
      )
      const segmentHaps = segment.pattern.query(
        state.setSpan(span).setControls({ _moveStart: segment.start })
      )
      // Remember which move each event came from (code highlighting only lights the live move's code).
      for (const hap of segmentHaps) hap.context = { ...hap.context, moveId: segment.id }
      haps.push(...segmentHaps)
    })
    return haps
  })
}

/** Insert (or replace) a segment, keeping segments ordered by `from`. Later segments at the same cycle win. */
export const insertSegment = (segments: Segment[], segment: Segment) => {
  const rest = segments.filter((s) => s.id !== segment.id && s.from !== segment.from)
  const next = [...rest, segment].sort((a, b) => a.from - b.from)
  next[0] = { ...next[0]!, from: -Infinity }
  return next
}

/** Drop segments that have been fully superseded before `cycle` (keep one bar of slack for long notes). */
export const pruneSegments = (segments: Segment[], cycle: number) => {
  let start = 0
  while (start < segments.length - 1 && segments[start + 1]!.from <= cycle - 1) start++
  if (start === 0) return segments
  const next = segments.slice(start)
  next[0] = { ...next[0]!, from: -Infinity }
  return next
}

export const removeSegment = (segments: Segment[], id: string) => {
  const next = segments.filter((s) => s.id !== id)
  if (next.length) next[0] = { ...next[0]!, from: -Infinity }
  return next
}
