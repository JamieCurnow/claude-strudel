// Pure helpers for working with Strudel programs as text. No Strudel imports, so these are unit-testable in node.

/** Beats per bar. The app's convention is 1 cycle = 1 bar of 4/4, so cps = bpm / 240. */
export const BEATS_PER_BAR = 4

export const bpmToCps = (bpm: number) => bpm / 60 / BEATS_PER_BAR
export const cpsToBpm = (cps: number) => cps * 60 * BEATS_PER_BAR

const TEMPO_LINE = /^[ \t]*setc(pm|ps)[ \t]*\(([^)\n]*)\)[ \t]*;?[ \t]*(\/\/[^\n]*)?$/gm

/** Evaluate a tiny tempo expression like `170/4` or `0.7` (numbers joined by * and /, left to right). */
export const evalArithmetic = (expr: string) => {
  const tokens = expr.replace(/\s+/g, '').match(/^(\d+(?:\.\d+)?)((?:[*/]\d+(?:\.\d+)?)*)$/)
  if (!tokens) return undefined
  let value = Number(tokens[1])
  for (const [, op, num] of tokens[2]!.matchAll(/([*/])(\d+(?:\.\d+)?)/g)) {
    value = op === '*' ? value * Number(num) : value / Number(num)
  }
  return Number.isFinite(value) ? value : undefined
}

/**
 * Tempo is owned by the app (so a scheduled move can change tempo exactly on its bar),
 * so `setcpm(...)` / `setcps(...)` lines are pulled out of the code before it is evaluated.
 * Returns the code without tempo lines and the last tempo found (as BPM, assuming 4 beats per cycle).
 */
export const extractTempo = (code: string) => {
  let bpm: number | undefined
  const stripped = code.replace(TEMPO_LINE, (_line, kind: string, expr: string) => {
    const value = evalArithmetic(expr.trim())
    if (value !== undefined) bpm = kind === 'pm' ? value * BEATS_PER_BAR : cpsToBpm(value)
    return ''
  })
  return { code: stripped.replace(/^\n+/, ''), bpm }
}

export interface Block {
  /** Label as written, including mute/solo markers, e.g. `drums`, `_hats`, `Sbass`. */
  label: string
  /** Label with mute/solo markers removed, e.g. `hats`. */
  name: string
  muted: boolean
  code: string
}

export interface ParsedProgram {
  /** Everything before the first labelled block (sample loading, constants, `all(...)`, comments). */
  preamble: string
  blocks: Block[]
}

const LABEL_LINE = /^([A-Za-z_$][\w$]*):[ \t]*/

const labelInfo = (label: string) => {
  const muted = label.startsWith('_') || label.endsWith('_')
  const name = label.replace(/^_+|_+$/g, '')
  return { name, muted }
}

/**
 * Split a program into a preamble and labelled blocks (`name: pattern`).
 * A block runs from its label to the next line that starts with a label. Lines after the last block
 * that are global statements (`all(...)`, `each(...)`) are kept in a trailing preamble section.
 */
export const parseProgram = (code: string): ParsedProgram => {
  const lines = code.split('\n')
  const blocks: Block[] = []
  const preambleLines: string[] = []
  let current: { label: string; lines: string[] } | undefined

  const flush = () => {
    if (!current) return
    const { name, muted } = labelInfo(current.label)
    blocks.push({ label: current.label, name, muted, code: trimBlock(current.lines.join('\n')) })
    current = undefined
  }

  for (const line of lines) {
    const label = LABEL_LINE.exec(line)?.[1]
    if (label && !line.startsWith('http')) {
      flush()
      current = { label, lines: [line.slice(line.indexOf(':') + 1).trimStart()] }
      continue
    }
    if (current && /^(all|each|setcpm|setcps|samples)\s*\(/.test(line)) {
      flush()
      preambleLines.push(line)
      continue
    }
    if (current) current.lines.push(line)
    else preambleLines.push(line)
  }
  flush()
  return { preamble: preambleLines.join('\n').trim(), blocks }
}

const trimBlock = (code: string) => code.replace(/\s+$/g, '')

export const blockLabel = (block: Pick<Block, 'name' | 'muted'>) =>
  block.muted ? `_${block.name}` : block.name

/** Rebuild program text from a parsed program. Global statements in the preamble go at the end. */
export const printProgram = (program: ParsedProgram) => {
  const preambleLines = program.preamble.split('\n')
  const globals = preambleLines.filter((line) => /^(all|each)\s*\(/.test(line))
  const head = preambleLines
    .filter((line) => !/^(all|each)\s*\(/.test(line))
    .join('\n')
    .trim()
  const body = program.blocks.map((block) => `${blockLabel(block)}: ${block.code}`).join('\n\n')
  return [head, body, globals.join('\n')].filter((part) => part.trim().length).join('\n\n') + '\n'
}

export interface BlockChange {
  name: string
  /** New code for the block (without the label). `null` removes the block. */
  code: string | null
  /** Optional mute state. `null` keeps the current state (new blocks default to unmuted). */
  muted: boolean | null
}

/** Apply block-mode changes from Claude to a program. Blocks keep their order; new blocks are appended. */
export const applyBlockChanges = (opts: {
  code: string
  changes: BlockChange[]
  preamble?: string | null
}) => {
  const { code, changes, preamble } = opts
  const program = parseProgram(code)
  if (preamble !== undefined && preamble !== null) program.preamble = preamble
  for (const change of changes) {
    const name = labelInfo(change.name).name
    const index = program.blocks.findIndex((block) => block.name === name)
    if (change.code === null) {
      if (index >= 0) program.blocks.splice(index, 1)
      continue
    }
    const existing = index >= 0 ? program.blocks[index] : undefined
    const muted = change.muted ?? existing?.muted ?? labelInfo(change.name).muted
    const block = { label: blockLabel({ name, muted }), name, muted, code: trimBlock(change.code) }
    if (existing) program.blocks[index] = block
    else program.blocks.push(block)
  }
  return printProgram(program)
}

/** Set the mute state of named blocks (used by quick voice commands like "mute hats"). */
export const setMuted = (opts: { code: string; names: string[]; muted: boolean }) => {
  const program = parseProgram(opts.code)
  const wanted = opts.names.map((name) => name.toLowerCase())
  let changed = false
  for (const block of program.blocks) {
    if (!wanted.includes(block.name.toLowerCase()) || block.muted === opts.muted) continue
    block.muted = opts.muted
    changed = true
  }
  return { code: printProgram(program), changed }
}

export type DiffLine = { type: 'same' | 'add' | 'del'; text: string }

/** Small LCS line diff, good enough for showing what a move changes (programs are tens of lines). */
export const diffLines = (before: string, after: string): DiffLine[] => {
  const a = before.split('\n')
  const b = after.split('\n')
  const dp = Array.from({ length: a.length + 1 }, () => Array.from({ length: b.length + 1 }, () => 0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ type: 'same', text: a[i]! })
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ type: 'del', text: a[i++]! })
    } else {
      out.push({ type: 'add', text: b[j++]! })
    }
  }
  while (i < a.length) out.push({ type: 'del', text: a[i++]! })
  while (j < b.length) out.push({ type: 'add', text: b[j++]! })
  return out
}
