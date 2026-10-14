import { describe, expect, it } from 'vite-plus/test'
import { resolveTarget } from './timing'

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
