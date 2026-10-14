import { describe, expect, it } from 'vite-plus/test'
import { s as sound, stack } from '@strudel/core'
import { mini } from '@strudel/mini'
const s = (code: string) => sound(mini(code))
import { composeTimeline, insertSegment, pruneSegments } from './timeline'
import { rise, riser, snareRoll } from './helpers'

const onsets = (pattern: ReturnType<typeof composeTimeline>, begin: number, end: number) =>
  pattern
    .queryArc(begin, end)
    .filter((hap) => hap.hasOnset())
    .map((hap) => [hap.whole!.begin.valueOf(), hap.value.s])

describe('composeTimeline', () => {
  it('switches pattern exactly on the segment boundary', () => {
    let segments = insertSegment([], { id: 'a', from: 0, start: 0, pattern: s('bd*2') })
    segments = insertSegment(segments, { id: 'b', from: 2, start: 2, pattern: s('sd*2') })
    const composed = composeTimeline(segments)
    expect(onsets(composed, 1, 3)).toEqual([
      [1, 'bd'],
      [1.5, 'bd'],
      [2, 'sd'],
      [2.5, 'sd']
    ])
  })

  it('does not retrigger notes that started before the boundary', () => {
    const segments = insertSegment(insertSegment([], { id: 'a', from: 0, start: 0, pattern: s('bd') }), {
      id: 'b',
      from: 0.5,
      start: 0.5,
      pattern: s('long').slow(2)
    })
    // `long` starts at cycle 0 (before the boundary) so it must not sound at 0.5 or 1
    expect(onsets(composeTimeline(segments), 0, 1.9)).toEqual([[0, 'bd']])
  })

  it('prunes superseded segments', () => {
    let segments = insertSegment([], { id: 'a', from: 0, start: 0, pattern: s('bd') })
    segments = insertSegment(segments, { id: 'b', from: 4, start: 4, pattern: s('sd') })
    expect(pruneSegments(segments, 4.5).length).toBe(2)
    const pruned = pruneSegments(segments, 5.2)
    expect(pruned.map((x) => x.id)).toEqual(['b'])
    expect(pruned[0]!.from).toBe(-Infinity)
  })
})

describe('helpers', () => {
  it('rise() counts bars from the landing bar', () => {
    const segments = insertSegment([], { id: 'a', from: 0, start: 8, pattern: s('bd').gain(rise(4, 0, 1)) })
    const gains = composeTimeline(segments)
      .queryArc(8, 13)
      .filter((h) => h.hasOnset())
      .map((h) => Math.round(h.value.gain * 100) / 100)
    expect(gains).toEqual([0, 0.25, 0.5, 0.75, 1])
  })

  it('afterBars() and forBars() gate relative to the landing bar', () => {
    const pattern = stack(s('a').forBars(2), s('b').afterBars(2))
    const segments = insertSegment([], { id: 'a', from: 0, start: 16, pattern })
    expect(onsets(composeTimeline(segments), 16, 20).map((x) => x[1])).toEqual(['a', 'a', 'b', 'b'])
  })

  it('snareRoll() doubles every bar then stops', () => {
    const segments = insertSegment([], { id: 'a', from: 0, start: 0, pattern: snareRoll(3, 'sd') })
    const perBar = [0, 1, 2, 3].map((bar) => onsets(composeTimeline(segments), bar, bar + 1).length)
    expect(perBar).toEqual([4, 8, 16, 0])
  })

  it('riser() plays for its length only', () => {
    const segments = insertSegment([], { id: 'a', from: 0, start: 4, pattern: riser(2) })
    expect(onsets(composeTimeline(segments), 4, 6).length).toBe(32)
    expect(onsets(composeTimeline(segments), 6, 8).length).toBe(0)
  })
})
