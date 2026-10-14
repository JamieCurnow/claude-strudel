import { describe, expect, it } from 'vite-plus/test'
import { applyBlockChanges, diffLines, extractTempo, parseProgram, printProgram, setMuted } from './program'

const jungle = `setcpm(170/4)
// dark jungle
amen: s("breaks165").fit().splice(16, "0 1 [2 3] 4")
  .gain(1.1)

_hats: s("hh*16").gain(.4)

reese: note("c2").s("supersaw").lpf(400)

all(x => x.lpf(5000))
`

describe('extractTempo', () => {
  it('pulls setcpm out and converts to bpm', () => {
    const { code, bpm } = extractTempo(jungle)
    expect(bpm).toBe(170)
    expect(code).not.toContain('setcpm')
    expect(code.startsWith('// dark jungle')).toBe(true)
  })
  it('handles setcps', () => {
    expect(extractTempo('setcps(0.5)\nx: s("bd")').bpm).toBe(120)
  })
  it('ignores non-arithmetic expressions', () => {
    expect(extractTempo('setcpm(slider(120))\nx: s("bd")').bpm).toBeUndefined()
  })
})

describe('parseProgram', () => {
  it('splits labelled blocks and keeps globals in the preamble', () => {
    const program = parseProgram(extractTempo(jungle).code)
    expect(program.blocks.map((b) => [b.name, b.muted])).toEqual([
      ['amen', false],
      ['hats', true],
      ['reese', false]
    ])
    expect(program.blocks[0]!.code).toContain('.gain(1.1)')
    expect(program.preamble).toContain('all(x => x.lpf(5000))')
    expect(program.preamble).toContain('// dark jungle')
  })
  it('round-trips through printProgram', () => {
    const once = printProgram(parseProgram(jungle))
    expect(printProgram(parseProgram(once))).toBe(once)
    expect(once.trim().endsWith('all(x => x.lpf(5000))')).toBe(true)
  })
})

describe('applyBlockChanges', () => {
  it('replaces, adds, removes and mutes blocks', () => {
    const next = applyBlockChanges({
      code: jungle,
      changes: [
        { name: 'hats', code: 's("hh*32").gain(.5)', muted: false },
        { name: 'reese', code: null, muted: null },
        { name: 'pad', code: 'note("<c3 eb3>").s("sawtooth")', muted: null }
      ]
    })
    const program = parseProgram(next)
    expect(program.blocks.map((b) => b.label)).toEqual(['amen', 'hats', 'pad'])
    expect(program.blocks[1]!.code).toBe('s("hh*32").gain(.5)')
  })
})

describe('setMuted', () => {
  it('mutes blocks by name', () => {
    const { code, changed } = setMuted({ code: jungle, names: ['amen'], muted: true })
    expect(changed).toBe(true)
    expect(code).toContain('_amen: ')
  })
})

describe('diffLines', () => {
  it('marks added and removed lines', () => {
    const diff = diffLines('a\nb\nc', 'a\nx\nc')
    expect(diff.map((d) => d.type)).toEqual(['same', 'del', 'add', 'same'])
  })
})
