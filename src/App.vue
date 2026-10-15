<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getAudioContext } from '@strudel/webaudio'
import { engine } from '@/engine/engine'
import { useClock } from '@/stores/clock'
import { useDeck } from '@/stores/deck'
import { useDirector } from '@/stores/director'
import { useVisuals } from '@/stores/visuals'
import { useVoice } from '@/stores/voice'
import BootCurtain from '@/components/BootCurtain.vue'
import CodeStage from '@/components/CodeStage.vue'
import CueStack from '@/components/CueStack.vue'
import DirectionBar from '@/components/DirectionBar.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'
import TransportBar from '@/components/TransportBar.vue'
import VisualLayer from '@/components/VisualLayer.vue'

const clock = useClock()
const deck = useDeck()
const director = useDirector()
const voice = useVoice()
const visuals = useVisuals()

// Dev-only handle for poking at the show from the console.
if (import.meta.env.DEV) Object.assign(window, { __show: { engine, deck, director, voice, visuals, clock } })

const loading = ref('Starting')
const booted = ref(false)
const bootError = ref('')
const curtain = ref(true)
const showSettings = ref(false)
const stageView = ref(false)
const bar = ref<InstanceType<typeof DirectionBar>>()

onMounted(async () => {
  clock.run()
  try {
    await engine.boot({ onProgress: (message) => (loading.value = message) })
    booted.value = true
    // Re-apply the last stage look and re-arm what was playing before a reload.
    const last = deck.history.at(-1)
    if (last?.visuals) visuals.apply(last.visuals)
  } catch (err) {
    bootError.value = `Could not start Strudel: ${(err as Error).message}`
  }
})

const start = async () => {
  await getAudioContext().resume()
  curtain.value = false
}

const typing = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  return (
    !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
  )
}

const onKeyDown = (event: KeyboardEvent) => {
  if (curtain.value) {
    if (booted.value && (event.key === 'Enter' || event.code === 'Space')) {
      event.preventDefault()
      void start()
    }
    return
  }
  if (showSettings.value) return
  if (event.key === 'Escape') {
    ;(event.target as HTMLElement).blur?.()
    if (director.busy) director.cancelLatest()
    else if (deck.queued.length) void deck.cancel(deck.queued.at(-1)!.id)
    return
  }
  if (typing(event)) return
  if (event.code === 'Space') {
    event.preventDefault()
    if (!event.repeat) voice.press()
  } else if (event.key === 'g' || event.key === 'G') void deck.go()
  else if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
    event.preventDefault()
    void deck.undo()
  } else if (/^[1-3]$/.test(event.key)) {
    const idea = deck.ideas[Number(event.key) - 1]
    if (idea?.code) void deck.playIdea(idea.id)
  } else if (event.key === 's') stageView.value = !stageView.value
  else if (event.key === 'Enter' || event.key === '/') {
    event.preventDefault()
    bar.value?.focus()
  }
}

const onKeyUp = (event: KeyboardEvent) => {
  if (event.code === 'Space' && !typing(event)) void voice.release()
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <VisualLayer />
  <div class="relative h-full flex flex-col">
    <TransportBar v-show="!stageView" @settings="showSettings = true" @stage="stageView = true" />
    <main
      class="flex-1 min-h-0 grid"
      :class="stageView ? 'grid-cols-[minmax(0,1fr)]' : 'grid-cols-[minmax(0,1fr)_minmax(300px,380px)]'"
    >
      <CodeStage />
      <CueStack v-show="!stageView" />
    </main>
    <DirectionBar v-show="!stageView" ref="bar" />
    <button
      v-if="stageView"
      class="absolute top-3 right-4 text-sm text-ink-faint opacity-0 hover:opacity-100 focus:opacity-100"
      aria-label="Show controls"
      @click="stageView = false"
    >
      S
    </button>
    <p
      v-if="stageView && director.say"
      class="absolute bottom-6 left-8 expanded font-semibold text-3xl [text-shadow:0_2px_20px_rgb(0_0_0/0.9)]"
    >
      {{ director.say }}
    </p>
  </div>
  <SettingsPanel v-if="showSettings" @close="showSettings = false" />
  <BootCurtain v-if="curtain" :loading="loading" :ready="booted" :error="bootError" @start="start" />
</template>
