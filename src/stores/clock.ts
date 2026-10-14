import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { engine } from '@/engine/engine'
import { BEATS_PER_BAR } from '@/engine/program'
import { useSettings } from './settings'

/** Reactive view of the engine clock, sampled every animation frame. 1 cycle = 1 bar. */
export const useClock = defineStore('clock', () => {
  const cycle = ref(0)
  const bpm = ref(170)
  const started = ref(false)
  const ready = ref(false)
  const { settings } = useSettings()

  const bar = computed(() => Math.floor(cycle.value))
  const beat = computed(() => Math.floor((cycle.value - bar.value) * BEATS_PER_BAR))
  const phraseBars = computed(() => settings.phraseBars)
  const barInPhrase = computed(() => ((bar.value % phraseBars.value) + phraseBars.value) % phraseBars.value)
  const phrase = computed(() => Math.floor(bar.value / phraseBars.value))

  let frame = 0
  const sample = () => {
    started.value = engine.started
    ready.value = engine.ready
    if (engine.ready) {
      cycle.value = engine.started ? engine.now() : cycle.value
      bpm.value = Math.round(engine.bpm * 10) / 10
    }
    frame = requestAnimationFrame(sample)
  }
  const run = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(sample)
  }

  /** The cycle the scheduler has already queried up to: anything scheduled before this would be late. */
  const frontier = () => Math.max(engine.now(), engine.repl?.scheduler.lastEnd ?? 0)

  return { cycle, bpm, started, ready, bar, beat, barInPhrase, phrase, phraseBars, run, frontier }
})
