<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useDeck } from '@/stores/deck'
import CueCard from './CueCard.vue'

/** The cue stack, top to bottom in show order: what played, what's live, what's next, what could be. */
const deck = useDeck()
const list = ref<HTMLElement>()

const past = computed(() => deck.history.slice(-30))
const upcoming = computed(() => [...deck.queued, ...deck.generating, ...deck.ready, ...deck.failed])

// Keep "now" at the top of the stack as the show moves on, so what's next and the ideas stay in view.
const scrollToNow = async (behavior: ScrollBehavior = 'smooth') => {
  await nextTick()
  const box = list.value
  const now = box?.querySelector<HTMLElement>('[data-now], [data-next]')
  if (!box) return
  box.scrollTo({ top: now ? now.offsetTop - box.offsetTop - 8 : box.scrollHeight, behavior })
}
watch(
  () => [deck.live?.id, upcoming.value.length, deck.ideas.length],
  () => scrollToNow()
)
onMounted(() => scrollToNow('instant'))
</script>

<template>
  <aside class="glass border-l border-line flex flex-col min-h-0" aria-label="Cue stack">
    <div ref="list" class="flex-1 overflow-y-auto scroll-thin px-3 py-3 space-y-2">
      <CueCard v-for="cue in past" :key="cue.id" :cue="cue" />
      <div v-if="deck.live" data-now>
        <CueCard :cue="deck.live" />
      </div>
      <CueCard
        v-for="(cue, i) in upcoming"
        :key="cue.id"
        :cue="cue"
        :data-next="!deck.live && i === 0 ? '' : undefined"
      />
      <template v-if="deck.ideas.length">
        <hr class="border-line !my-4" />
        <CueCard v-for="(cue, i) in deck.ideas" :key="cue.id" :cue="cue" :hotkey="String(i + 1)" />
      </template>
    </div>
  </aside>
</template>
