import type { EditMode } from '#shared/director'
import guide from './guide.md?raw'
import reference from './generated/reference.md?raw'
import sounds from './generated/sounds.md?raw'

const styles = import.meta.glob<string>('./styles/*.md', { query: '?raw', import: 'default', eager: true })

const styleText = Object.entries(styles)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, text]) => `<style name="${path.replace(/^.*\/|\.md$/g, '')}">\n${text.trim()}\n</style>`)
  .join('\n\n')

/**
 * The big, stable part of the system prompt: guide + style packs + sound list + function reference.
 * Identical bytes on every request so it stays in the prompt cache (1h TTL). Never interpolate anything
 * per-request in here.
 */
export const SYSTEM_PROMPT = [
  guide.trim(),
  `# Style packs\n\nGenre knowledge and tested example programs. Borrow idioms freely; don't copy whole examples unless asked for a "classic" take.\n\n${styleText}`,
  `# Sound list\n\nEvery sound you can use. Anything else fails validation.\n\n${sounds.trim()}`,
  `# Strudel function reference\n\nEvery function you can use, one per line. Mini-notation reference: spaces sequence, [] subdivide, <> alternate per cycle, * speed up, / slow down, ! repeat, @ elongate, ? random drop, | random choice, , play together (chords/polyrhythm), ~ or - rest, "name:3" picks variation 3.\n\n${reference.trim()}`
].join('\n\n---\n\n')

const MODE_INSTRUCTIONS: Record<EditMode, string> = {
  full: 'Edit mode: **full**. Every move must include `code`: the complete program after the move (all blocks, including unchanged ones copied exactly).',
  blocks:
    'Edit mode: **blocks**. Every move must include `blocks`: only the blocks that change (`{name, code, muted}`), plus `preamble` (null unless the lines before the first block or the `all(...)` lines change). Do not resend unchanged blocks. For a brand new track, send every block of the new track and `code: null` for every old block that should go.'
}

export const modeInstructions = (mode: EditMode) => MODE_INSTRUCTIONS[mode]
