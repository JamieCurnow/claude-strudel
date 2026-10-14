// Quick commands: handled instantly in the browser, no Claude round trip.

export type QuickCommand =
  | { type: 'go' }
  | { type: 'undo' }
  | { type: 'stop' }
  | { type: 'start' }
  | { type: 'cancel' }
  | { type: 'mute'; names: string[] }
  | { type: 'unmute'; names: string[] }
  | { type: 'idea'; index: number }

const NUMBERS: Record<string, number> = { one: 1, two: 2, three: 3, '1': 1, '2': 2, '3': 3 }

const names = (text: string) =>
  text
    .split(/,|\band\b|&/)
    .map((name) => name.replace(/\b(the|a|an)\b/g, '').trim())
    .filter(Boolean)

export const parseQuickCommand = (input: string): QuickCommand | undefined => {
  const text = input
    .toLowerCase()
    .replace(/[.!?]+$/g, '')
    .trim()
  if (/^(go|go go|launch|hit it|now|go now)$/.test(text)) return { type: 'go' }
  if (/^(undo|go back|back|undo that)$/.test(text)) return { type: 'undo' }
  if (/^(stop|stop the music|kill it|stop everything|hush)$/.test(text)) return { type: 'stop' }
  if (/^(start|play|start the music)$/.test(text)) return { type: 'start' }
  if (/^(cancel|cancel that|scrap that|never ?mind)$/.test(text)) return { type: 'cancel' }
  const idea = /^(?:play |go )?idea (one|two|three|[123])$/.exec(text)
  if (idea) return { type: 'idea', index: NUMBERS[idea[1]!]! - 1 }
  const mute = /^(mute|unmute|drop out|bring back) (?:the )?([a-z0-9 ,&]+)$/.exec(text)
  if (mute) {
    const list = names(mute[2]!)
    if (list.length && list.every((name) => /^[a-z0-9]+$/.test(name))) {
      return { type: mute[1] === 'mute' || mute[1] === 'drop out' ? 'mute' : 'unmute', names: list }
    }
  }
  return undefined
}
