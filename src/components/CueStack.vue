<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useDeck } from '@/stores/deck'
import CueCard from './CueCard.vue'

/** The cue stack, top to bottom in show order: what played, what's live, what's next, what could be. */
const deck = useDeck()
const list = ref<HTMLElement>()

const past = computed(() => deck.history.slice(-30))
const upcoming = computed(() => [...deck.queued, ...deck.generating, ...deck.ready, ...deck.failed])

// Keep "now" in view as the show moves on.
watch(
  () => deck.live?.id,
  async () => {
    await nextTick()
    list.value?.querySelector('[data-now]')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
)
</script>

<template>
  <aside class="glass border-l border-line flex flex-col min-h-0" aria-label="Cue stack">
    <div class="px-4 pt-4 pb-2 flex items-baseline justify-between">
      <h2 class="expanded font-bold text-lg">Cues</h2>
      <span class="text-xs text-ink-faint">{{ deck.history.length }} played</span>
    </div>
    <div ref="list" class="flex-1 overflow-y-auto scroll-thin px-3 pb-4 space-y-2">
      <CueCard v-for="cue in past" :key="cue.id" :cue="cue" />
      <div v-if="deck.live" data-now>
        <CueCard :cue="deck.live" />
      </div>
      <CueCard v-for="cue in upcoming" :key="cue.id" :cue="cue" />
      <template v-if="deck.ideas.length">
        <h3 class="text-sm text-ink-faint pt-3 px-1">
          Ideas Claude wrote ahead · press 1–{{ deck.ideas.length }}
        </h3>
        <CueCard v-for="(cue, i) in deck.ideas" :key="cue.id" :cue="cue" :hotkey="String(i + 1)" />
      </template>
      <p v-if="!deck.cues.length" class="text-sm text-ink-faint px-1 pt-2 leading-relaxed">
        Each thing you ask for becomes a cue. Cues land on the bar: armed cues wait for GO, and ideas show up
        here greyed out, ready to play.
      </p>
    </div>
  </aside>
</template>
