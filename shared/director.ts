// The contract between the app, the Worker and Claude. Claude answers every direction with a
// DirectorOutput (enforced with structured outputs), which the app turns into moves on the deck.

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Opus 5.5', fast: true },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', fast: false },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5', fast: false }
] as const
export type ModelId = (typeof MODELS)[number]['id']

export const EFFORTS = ['low', 'medium', 'high'] as const
export type Effort = (typeof EFFORTS)[number]

/** full: Claude returns the whole program every time. blocks: Claude returns only the blocks it changes. */
export type EditMode = 'full' | 'blocks'

/**
 * Stated in every direction's <context> rather than the system prompt: the system prompt must never change
 * mid-set, or earlier thinking blocks stop validating (they're bound to the exact conversation prefix).
 */
export const EDIT_MODE_LINE: Record<EditMode, string> = {
  full: 'edit mode full: every move includes `code`, the complete program after the move (unchanged blocks copied exactly)',
  blocks:
    'edit mode blocks: every move includes `blocks` (only the blocks that change) and `preamble` (null unless it changes); for a brand new track send every new block plus `code: null` for each old block that should go'
}

export const WHEN_TYPES = ['next_bar', 'next_phrase', 'in_bars', 'manual'] as const
export type WhenType = (typeof WHEN_TYPES)[number]

export interface When {
  type: WhenType
  /** For `in_bars`: bars counted from the bar the direction was given on. */
  bars: number | null
}

export const VISUAL_MODES = [
  'none',
  'scope',
  'spectrum',
  'pianoroll',
  'punchcard',
  'spiral',
  'hydra'
] as const
export type VisualMode = (typeof VISUAL_MODES)[number]

export interface Visuals {
  /** Any CSS background value: a colour or gradient. */
  background: string | null
  /** Accent colour (CSS) for visualisers, highlights and text. */
  accent: string | null
  /** Big overlay text (track title, a word, a shout). Empty string clears it. */
  text: string | null
  mode: VisualMode | null
  /** Hydra sketch (JS using hydra-synth globals, ending in .out()). Only used when mode is 'hydra'. */
  hydra: string | null
}

export interface BlockChange {
  name: string
  /** Block code without the label. null removes the block. */
  code: string | null
  /** true mutes (keeps the code, silent), false unmutes, null leaves as is. */
  muted: boolean | null
}

export interface MoveSpec {
  title: string
  summary: string
  when: When
  /** Tempo for this move (BPM), or null to keep the current tempo. */
  bpm: number | null
  /** Full mode: the complete program. */
  code?: string | null
  /** Blocks mode: only the blocks that change. */
  blocks?: BlockChange[] | null
  /** Blocks mode: replacement for the code before the first block (and `all(...)` lines), or null to keep it. */
  preamble?: string | null
  visuals: Visuals | null
}

export interface Idea {
  title: string
  /** The direction, written as the performer would say it. */
  direction: string
}

export interface DirectorOutput {
  say: string
  moves: MoveSpec[]
  ideas: Idea[]
}

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] })

const visualsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['background', 'accent', 'text', 'mode', 'hydra'],
  properties: {
    background: nullable({ type: 'string' }),
    accent: nullable({ type: 'string' }),
    text: nullable({ type: 'string' }),
    mode: nullable({ type: 'string', enum: [...VISUAL_MODES] }),
    hydra: nullable({ type: 'string' })
  }
}

const whenSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'bars'],
  properties: {
    type: { type: 'string', enum: [...WHEN_TYPES] },
    bars: nullable({ type: 'integer' })
  }
}

const blockChangeSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'code', 'muted'],
  properties: {
    name: { type: 'string' },
    code: nullable({ type: 'string' }),
    muted: nullable({ type: 'boolean' })
  }
}

/** JSON schema for structured outputs. Field order matters: say/title first so the UI can show them early. */
export const directorSchema = (mode: EditMode) => {
  const moveProperties: Record<string, unknown> = {
    title: { type: 'string' },
    summary: { type: 'string' },
    when: whenSchema,
    bpm: nullable({ type: 'number' })
  }
  if (mode === 'full') moveProperties.code = { type: 'string' }
  else {
    moveProperties.blocks = { type: 'array', items: blockChangeSchema }
    moveProperties.preamble = nullable({ type: 'string' })
  }
  moveProperties.visuals = nullable(visualsSchema)
  return {
    type: 'object',
    additionalProperties: false,
    required: ['say', 'moves', 'ideas'],
    properties: {
      say: { type: 'string' },
      moves: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: Object.keys(moveProperties),
          properties: moveProperties
        }
      },
      ideas: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'direction'],
          properties: { title: { type: 'string' }, direction: { type: 'string' } }
        }
      }
    }
  }
}

/** Minimal message shape sent to the Worker (content is passed through to the API untouched). */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string | unknown[]
}

export interface DirectRequest {
  messages: ChatMessage[]
  mode: EditMode
  model: ModelId
  effort: Effort
  fast: boolean
}

export const isModelId = (value: unknown): value is ModelId => MODELS.some((m) => m.id === value)
