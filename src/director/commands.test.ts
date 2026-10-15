import { describe, expect, it } from 'vite-plus/test'
import { matchCueTitle, parseQuickCommand } from './commands'

describe('parseQuickCommand', () => {
  it('parses transport commands', () => {
    expect(parseQuickCommand('Go!')).toEqual({ type: 'go' })
    expect(parseQuickCommand('undo')).toEqual({ type: 'undo' })
    expect(parseQuickCommand('stop.')).toEqual({ type: 'stop' })
    expect(parseQuickCommand('idea two')).toEqual({ type: 'idea', index: 1 })
  })
  it('parses mutes with block names', () => {
    expect(parseQuickCommand('mute the hats')).toEqual({ type: 'mute', names: ['hats'] })
    expect(parseQuickCommand('unmute hats and pad')).toEqual({ type: 'unmute', names: ['hats', 'pad'] })
  })
  it('leaves musical directions for Claude', () => {
    expect(parseQuickCommand('stop the drums and build it up')).toBeUndefined()
    expect(parseQuickCommand('mute the hats then bring in a riser over 8 bars')).toBeUndefined()
    expect(parseQuickCommand('drop in 8 bars')).toBeUndefined()
  })
  it('parses "back to" as a recall', () => {
    expect(parseQuickCommand('back to the liquid roller')).toEqual({ type: 'recall', title: 'liquid roller' })
    expect(parseQuickCommand('go back to the drop')).toEqual({ type: 'recall', title: 'drop' })
  })
})

describe('matchCueTitle', () => {
  const cues = [
    { title: 'Drop ↓ D minor' },
    { title: 'Drop' },
    { title: 'Liquid roller' },
    { title: 'Pre-drop build' }
  ]
  it('prefers an exact title, then a title that starts with the phrase', () => {
    expect(matchCueTitle({ phrase: 'the drop', cues })).toBe(cues[1])
    expect(matchCueTitle({ phrase: 'liquid', cues })).toBe(cues[2])
  })
  it('leaves loose references for Claude', () => {
    expect(matchCueTitle({ phrase: 'jungle hats from the first track', cues })).toBeUndefined()
    expect(matchCueTitle({ phrase: 'build', cues })).toBeUndefined()
  })
})
