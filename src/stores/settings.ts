import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { EditMode, Effort, ModelId } from '#shared/director'

export type LaunchMode = 'auto' | 'arm'
export type Quantize = 'next_bar' | 'next_phrase'

const KEY = 'claude-strudel:settings'

const defaults = {
  model: 'claude-opus-5-5' as ModelId,
  effort: 'low' as Effort,
  fast: false,
  editMode: 'blocks' as EditMode,
  /** auto: moves launch on Claude's `when`. arm: every move waits on the deck for GO. */
  launchMode: 'auto' as LaunchMode,
  /** Where GO / recall / quick commands land. */
  goQuantize: 'next_bar' as Quantize,
  phraseBars: 4,
  /** How many of Claude's next-move ideas to pre-generate in the background (0 = off). */
  ideas: 2,
  autoRepair: true,
  password: ''
}

export type Settings = typeof defaults

const load = (): Settings => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) } : { ...defaults }
  } catch {
    return { ...defaults }
  }
}

export const useSettings = defineStore('settings', () => {
  const settings = ref<Settings>(load())
  watch(
    settings,
    (value) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(value))
      } catch {}
    },
    { deep: true }
  )
  const reset = () => (settings.value = { ...defaults })
  return { settings, reset }
})
