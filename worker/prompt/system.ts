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
