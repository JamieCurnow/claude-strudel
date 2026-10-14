// Every ```strudel code block in the prompt files must compile, play only sounds the app loads, and stay
// within the density limit. Claude copies these idioms, so a broken example becomes a broken set.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'
import { compileHeadless } from '../../src/engine/headless'

const root = new URL('.', import.meta.url).pathname
const sounds = new Set<string>(JSON.parse(readFileSync(join(root, 'generated/sounds.json'), 'utf8')))

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'generated' ? [] : walk(path)
    return name.endsWith('.md') ? [path] : []
  })

const examples = walk(root).flatMap((file) =>
  [...readFileSync(file, 'utf8').matchAll(/```strudel\n([\s\S]*?)```/g)].map((match, i) => ({
    name: `${file.replace(root, '')} #${i + 1}`,
    code: match[1]!
  }))
)

describe('prompt examples', () => {
  it('has examples', () => expect(examples.length).toBeGreaterThan(0))

  for (const example of examples) {
    it(`compiles: ${example.name}`, async () => {
      const result = await compileHeadless(example.code)
      if (!result.ok) throw new Error(`${example.name}: ${result.error}\n${example.code}`)
      const haps = result.pattern.queryArc(0, 8).filter((hap) => hap.hasOnset())
      const unknown = new Set<string>()
      for (const hap of haps) {
        const { s, bank } = hap.value ?? {}
        if (typeof s !== 'string') continue
        const key = (bank ? `${bank}_${s}` : s).toLowerCase()
        if (!sounds.has(key)) unknown.add(key)
      }
      expect([...unknown], `unknown sounds in ${example.name}`).toEqual([])
      expect(haps.length / 8, `events per bar in ${example.name}`).toBeLessThan(512)
    })
  }
})
