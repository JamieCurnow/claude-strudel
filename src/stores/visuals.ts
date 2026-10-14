import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { VisualMode, Visuals } from '#shared/director'

export const DEFAULT_BACKGROUND =
  'radial-gradient(120% 90% at 30% 110%, #1d1430 0%, #0d0b14 55%, #07060b 100%)'

/** The stage look. Claude sets these through a move's `visuals`, landing on the same bar as the music. */
export const useVisuals = defineStore('visuals', () => {
  const background = ref(DEFAULT_BACKGROUND)
  const accent = ref('#f7b267')
  const text = ref('')
  const mode = ref<VisualMode>('scope')
  const hydra = ref('')
  /** Bumped on every apply so watchers re-run even when the hydra code is identical. */
  const version = ref(0)
  const hydraError = ref('')

  const apply = (next: Visuals) => {
    if (next.background) background.value = next.background
    if (next.accent) accent.value = next.accent
    if (next.text !== null && next.text !== undefined) text.value = next.text
    if (next.mode) mode.value = next.mode
    if (next.hydra) hydra.value = next.hydra
    version.value++
  }

  const reset = () => {
    background.value = DEFAULT_BACKGROUND
    accent.value = '#f7b267'
    text.value = ''
    mode.value = 'scope'
    hydra.value = ''
    version.value++
  }

  return { background, accent, text, mode, hydra, version, hydraError, apply, reset }
})
