<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDeck } from '@/stores/deck'
import { useDirector } from '@/stores/director'
import { useVoice } from '@/stores/voice'

const director = useDirector()
const voice = useVoice()
const deck = useDeck()
const text = ref('')
const input = ref<HTMLInputElement>()
defineExpose({ focus: () => input.value?.focus() })

const send = async () => {
  const direction = text.value
  text.value = ''
  await director.direct(direction)
}

const nextGo = computed(() => deck.nextUp)
const listening = computed(() => voice.status === 'listening' || voice.status === 'connecting')
const placeholder = computed(() => {
  if (voice.status === 'listening') return voice.heard || 'Listening…'
  if (voice.status === 'finishing') return voice.heard || 'Finishing…'
  return director.queue.length
    ? `${director.queue.length} more queued for Claude…`
    : 'Tell the band what to do next'
})
</script>

<template>
  <footer class="glass border-t border-line px-5 pt-3 pb-4">
    <div class="flex items-baseline gap-3 min-h-8 mb-2">
      <p class="expanded font-semibold text-xl text-ink truncate" aria-live="polite">
        {{ director.say || ' ' }}
      </p>
      <p v-if="director.error" class="text-sm text-fail truncate" role="alert">{{ director.error }}</p>
      <p v-else-if="director.notice || voice.error" class="text-sm text-ink-dim truncate">
        {{ voice.error || director.notice }}
      </p>
    </div>
    <div class="flex items-stretch gap-3">
      <button
        class="relative shrink-0 w-28 rounded-lg border text-sm font-semibold transition-colors overflow-hidden"
        :class="
          listening
            ? 'border-live text-ink bg-live/20'
            : 'border-line text-ink-dim hover:text-ink hover:border-ink-faint'
        "
        aria-label="Hold to talk"
        @pointerdown.prevent="voice.press()"
        @pointerup.prevent="voice.release()"
        @pointerleave="voice.status === 'listening' && voice.release()"
      >
        <span
          class="absolute inset-y-0 left-0 bg-live/30 transition-[width] duration-75"
          :style="{ width: `${Math.min(100, voice.level * 300)}%` }"
          aria-hidden="true"
        />
        <span class="relative">{{ listening ? 'Listening' : 'Hold to talk' }}</span>
        <span class="relative block text-[11px] font-normal text-ink-faint">or hold Space</span>
      </button>
      <form class="flex-1 flex" @submit.prevent="send">
        <label class="sr-only" for="direction">Direction</label>
        <input
          id="direction"
          ref="input"
          v-model="text"
          autocomplete="off"
          class="flex-1 h-14 rounded-lg bg-black/40 border border-line px-4 text-lg placeholder:text-ink-faint focus:outline-none focus:border-amber/70"
          :placeholder="placeholder"
        />
      </form>
      <button
        class="shrink-0 w-32 rounded-lg expanded font-black text-3xl transition-colors"
        :class="
          nextGo ? 'bg-armed text-[#0b0b22] hover:brightness-110' : 'bg-white/5 text-ink-faint cursor-default'
        "
        :disabled="!nextGo"
        :title="nextGo ? `GO: ${nextGo.title} (G)` : 'Nothing armed'"
        @click="deck.go()"
      >
        GO
      </button>
    </div>
  </footer>
</template>
