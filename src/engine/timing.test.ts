import { describe, expect, it } from 'vite-plus/test'
import { planReply, resolveTarget } from './timing'

const base = { requestCycle: 10.3, frontier: 12.2, phraseBars: 4, started: true }

describe('resolveTarget', () => {
  it('next_bar lands on the next bar after the frontier', () => {
    expect(resolveTarget({ ...base, when: { type: 'next_bar', bars: null } })).toEqual({
      target: 13,
      late: false
    })
  })
  it('next_phrase lands on the next phrase boundary', () => {
    expect(resolveTarget({ ...base, when: { type: 'next_phrase', bars: null } })?.target).toBe(16)
  })
  it('in_bars counts from the bar the direction was given on', () => {
    expect(resolveTarget({ ...base, when: { type: 'in_bars', bars: 8 } })).toEqual({
      target: 18,
      late: false
    })
  })
  it('in_bars that already passed slides to the next bar and is marked late', () => {
    expect(resolveTarget({ ...base, when: { type: 'in_bars', bars: 1 } })).toEqual({
      target: 13,
      late: true,
      wanted: 11
    })
  })
  it('manual moves have no target', () => {
    expect(resolveTarget({ ...base, when: { type: 'manual', bars: null } })).toBeNull()
  })
  it('starts at bar 0 when stopped', () => {
    expect(resolveTarget({ ...base, started: false, when: { type: 'in_bars', bars: 8 } })).toEqual({
      target: 0,
      late: false
    })
  })
  it('does not land on a bar the scheduler has almost reached', () => {
    expect(resolveTarget({ ...base, frontier: 12.97, when: { type: 'next_bar', bars: null } })?.target).toBe(
      14
    )
  })
})

describe('planReply', () => {
  const plan = (whens: Parameters<typeof planReply>[0]['whens'], over = {}) =>
    planReply({ ...base, whens, ...over }).map((r) => r?.target)

  it('lands moves on their own bars when Claude is on time', () => {
    expect(
      plan([
        { type: 'next_bar', bars: null },
        { type: 'in_bars', bars: 8 }
      ])
    ).toEqual([13, 18])
  })
  it('keeps the build before a late drop, the planned distance apart', () => {
    // Asked at bar 10.3: build on 11, drop on 18 (7 bars later). Claude answers at bar 30.
    const late = { frontier: 30.2 }
    expect(
      plan(
        [
          { type: 'next_bar', bars: null },
          { type: 'in_bars', bars: 8 }
        ],
        late
      )
    ).toEqual([31, 38])
  })
  it('never stacks two moves on one bar', () => {
    expect(
      plan([
        { type: 'next_bar', bars: null },
        { type: 'next_bar', bars: null }
      ])
    ).toEqual([13, 14])
  })
  it('spreads a reply out from bar 0 when stopped', () => {
    expect(
      plan(
        [
          { type: 'next_bar', bars: null },
          { type: 'in_bars', bars: 8 }
        ],
        { started: false }
      )
    ).toEqual([0, 7])
  })
  it('leaves manual moves unplanned', () => {
    expect(
      plan([
        { type: 'manual', bars: null },
        { type: 'next_bar', bars: null }
      ])
    ).toEqual([undefined, 13])
  })
})
