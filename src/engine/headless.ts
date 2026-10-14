// Headless Strudel (no audio) for tests: compile code exactly like the app does and inspect the pattern.
import { evalScope, repl } from '@strudel/core'
import type { Pattern, Repl } from '@strudel/core'
import { transpiler } from '@strudel/transpiler'
import { extractTempo } from './program'
import { tagBlocks } from './tagging'

let instance: Repl | undefined
let captured: Pattern | undefined

const boot = async () => {
  if (instance) return instance
  await evalScope(
    import('@strudel/core'),
    import('@strudel/mini'),
    import('@strudel/tonal'),
    import('./helpers'),
    // Stand-ins for browser-only globals that appear in code (sample loading is done by the app).
    { samples: () => undefined, aliasBank: () => undefined }
  )
  instance = repl({
    transpiler,
    defaultOutput: () => undefined,
    getTime: () => 0,
    beforeEval: tagBlocks,
    editPattern: (pattern: Pattern) => {
      captured = pattern
      return pattern
    }
  })
  return instance
}

export const compileHeadless = async (source: string) => {
  const r = await boot()
  const { code, bpm } = extractTempo(source)
  captured = undefined
  await r.evaluate(code, false)
  if (!captured) return { ok: false as const, error: r.state.evalError?.message ?? 'no pattern', bpm }
  return { ok: true as const, pattern: captured as Pattern, bpm }
}
