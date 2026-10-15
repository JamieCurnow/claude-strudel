<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDeck } from '@/stores/deck'
import CueCard from './CueCard.vue'

/** The cue stack, newest at the top: what could be, what's next, what's live, then what played falling away. */
const deck = useDeck()
const list = ref<HTMLElement>()

const past = computed(() => deck.history.slice(-30).reverse())
const upcoming = computed(() => [...deck.queued, ...deck.generating, ...deck.ready, ...deck.failed].reverse())

// Bring the top back into view as the show moves on, so the ideas and what's next stay in sight.
watch(
  () => [deck.live?.id, upcoming.value.length, deck.ideas.length],
  () => list.value?.scrollTo({ top: 0, behavior: 'smooth' })
)
</script>

<template>
  <aside class="glass border-l border-line flex flex-col min-h-0" aria-label="Cue stack">
    <div ref="list" class="flex-1 overflow-y-auto scroll-thin px-3 py-3 space-y-2">
      <template v-if="deck.ideas.length">
        <CueCard v-for="(cue, i) in deck.ideas" :key="cue.id" :cue="cue" :hotkey="String(i + 1)" />
        <hr class="border-line !my-4" />
      </template>
      <CueCard v-for="cue in upcoming" :key="cue.id" :cue="cue" />
      <CueCard v-if="deck.live" :cue="deck.live" />
      <CueCard v-for="cue in past" :key="cue.id" :cue="cue" />
    </div>
  </aside>
</template>
