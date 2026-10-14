import { describe, expect, it } from 'vite-plus/test'
import { parseQuickCommand } from './commands'

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
})
