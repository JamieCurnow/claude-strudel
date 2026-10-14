import { describe, expect, it } from 'vite-plus/test'
import { compileHeadless } from './headless'

describe('compileHeadless', () => {
  it('compiles labelled blocks + all() and reports tempo', async () => {
    const result = await compileHeadless(`setcpm(170/4)
amen: s("breaks165").fit().splice(8, "0 1 [2 3] 4")
_hats: s("hh*16")
bass: n("0 ~ 3 ~").scale("C1:minor").s("sawtooth").lpf(rise(8, 200, 2000))
all(x => x.room(.2))`)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.bpm).toBe(170)
    const haps = result.pattern.queryArc(0, 1).filter((h) => h.hasOnset())
    expect(new Set(haps.map((h) => h.value._block))).toEqual(new Set(['amen', 'bass']))
    expect(haps.every((h) => h.value.room === 0.2)).toBe(true)
  })

  it('reports syntax errors', async () => {
    const result = await compileHeadless('drums: s("bd*4"')
    expect(result.ok).toBe(false)
  })
})
