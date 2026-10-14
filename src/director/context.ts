import { EDIT_MODE_LINE, type EditMode } from '#shared/director'
import type { Cue } from '@/stores/deck'

const describe = (cue: Cue) => `#${cue.number} "${cue.title}"`

/** Build the user turn Claude sees for a direction (format documented in worker/prompt/guide.md). */
export const buildDirectionMessage = (opts: {
  direction: string
  requestCycle: number
  bpm: number
  phraseBars: number
  launchMode: string
  editMode: EditMode
  started: boolean
  live?: Cue
  queued: Cue[]
  ready: Cue[]
  basis?: Cue
  results: string[]
}) => {
  const {
    direction,
    requestCycle,
    bpm,
    phraseBars,
    launchMode,
    editMode,
    started,
    live,
    queued,
    ready,
    basis,
    results
  } = opts
  const context = [
    `${started ? `bar ${requestCycle.toFixed(1)}` : 'stopped (next move starts the music)'} · ${bpm} bpm · phrase length ${phraseBars} bars · launch mode ${launchMode}`,
    `playing: ${live ? `${describe(live)} (landed bar ${Math.max(0, Math.round(live.landedCycle ?? 0))})` : 'nothing (silence)'}`,
    ...queued.map((cue) => `queued: ${describe(cue)} lands bar ${cue.targetCycle}`),
    ...ready.map((cue) => `armed (waiting for GO): ${describe(cue)}`),
    EDIT_MODE_LINE[editMode]
  ]
  const parts = [
    `<direction>${direction}</direction>`,
    `<context>\n${context.join('\n')}\n</context>`,
    `<current_code>\n${basis?.code.trim() ?? ''}\n</current_code>`
  ]
  if (basis && basis !== live) parts.push(`(current_code is ${describe(basis)}, the latest queued move)`)
  if (results.length) parts.push(`<results>\n${results.map((line) => `- ${line}`).join('\n')}\n</results>`)
  return parts.join('\n')
}

export const buildRepairMessage = (failures: { index: number; title: string; errors: string[] }[]) =>
  `<repair>\n${failures
    .map((f) => `move ${f.index + 1} "${f.title}": ${f.errors.join(' | ')}`)
    .join('\n')}\n</repair>\nFix these and send the complete reply again (same moves, corrected code).`
