<script setup lang="ts">
import { computed, ref } from 'vue'
import { parse as parsePartial, Allow } from 'partial-json'
import { diffLines } from '@/engine/program'
import { useClock } from '@/stores/clock'
import { useDeck, type Cue } from '@/stores/deck'
import { useDirector } from '@/stores/director'

const props = defineProps<{ cue: Cue; hotkey?: string }>()
const deck = useDeck()
const director = useDirector()
const clock = useClock()
const open = ref(false)

const gel = computed(
  () =>
    ({
      live: 'border-live bg-live/12',
      queued: 'border-amber bg-amber/10',
      ready: 'border-armed bg-armed/12',
      idea: 'border-steel/40 border-dashed bg-white/[0.02] opacity-80 hover:opacity-100',
      generating: 'border-amber/40 border-dashed bg-white/[0.03]',
      failed: 'border-fail/60 bg-fail/8',
      played: 'border-line bg-transparent opacity-60 hover:opacity-100',
      discarded: 'hidden'
    })[props.cue.status]
)

const barsAway = computed(() =>
  props.cue.targetCycle === undefined ? 0 : Math.max(0, props.cue.targetCycle - clock.cycle)
)

const status = computed(() => {
  const cue = props.cue
  switch (cue.status) {
    case 'live':
      return `live · bar ${Math.max(0, Math.round(cue.landedCycle ?? 0))}`
    case 'queued':
      return `bar ${cue.targetCycle} · in ${barsAway.value < 1 ? '<1' : Math.ceil(barsAway.value)}${cue.late ? ' · late' : ''}`
    case 'ready':
      return deck.nextUp?.id === cue.id ? 'next' : 'armed'
    case 'idea':
      return cue.code ? '' : 'writing'
    case 'generating':
      return cue.partial === undefined ? 'waiting' : 'writing'
    case 'failed':
      return 'failed'
    case 'played':
      return `bar ${Math.max(0, Math.round(cue.landedCycle ?? 0))}`
    default:
      return ''
  }
})

/** While generating, show the code typing in (pulled out of the partial JSON). */
const streamingCode = computed(() => {
  if (!props.cue.partial) return ''
  try {
    const partial = parsePartial(props.cue.partial, Allow.ALL) as {
      moves?: { code?: string; blocks?: { name?: string; code?: string | null }[] }[]
    }
    const move = partial.moves?.at(-1)
    const code =
      move?.code ??
      move?.blocks
        ?.map((b) => `${b.name ?? ''}: ${b.code === null ? '(removed)' : (b.code ?? '')}`)
        .join('\n') ??
      ''
    return code.split('\n').slice(-7).join('\n')
  } catch {
    return ''
  }
})

const diff = computed(() => {
  if (!open.value) return []
  const before = deck.live && deck.live.id !== props.cue.id ? deck.live.code : ''
  return diffLines(before, props.cue.code).filter((line) => line.type !== 'same' || before === '')
})

const hasActions = computed(() => {
  const { status, code } = props.cue
  return ['ready', 'queued', 'played', 'failed'].includes(status) || (status === 'idea' && !!code)
})

const timing = computed(() => {
  const m = props.cue.metrics
  if (!m?.totalMs) return ''
  return `${(m.totalMs / 1000).toFixed(1)}s · ${m.outputTokens ?? '?'} tok${m.repaired ? ' · repaired' : ''}`
})
</script>

<template>
  <article
    class="group relative rounded-lg border-l-4 border border-y-line border-r-line px-3.5 py-2.5 transition-opacity"
    :class="gel"
    :aria-label="`Cue ${cue.number || ''} ${cue.title}`"
  >
    <div class="flex items-start gap-3">
      <span
        class="expanded font-bold tabular-nums text-lg leading-6 w-8 shrink-0"
        :class="cue.status === 'live' ? 'text-live' : 'text-ink-faint'"
      >
        {{ cue.number || hotkey || '·' }}
      </span>
      <div class="min-w-0 flex-1">
        <button class="text-left w-full" @click="open = !open">
          <h3 class="font-semibold leading-6 truncate">{{ cue.title }}</h3>
          <p
            v-if="cue.summary && cue.summary !== cue.title"
            class="text-sm text-ink-dim leading-snug line-clamp-2"
          >
            {{ cue.summary }}
          </p>
        </button>
        <p class="text-xs mt-1 text-ink-dim tabular-nums">
          {{ status }}<span v-if="timing" class="text-ink-faint">{{ status ? ' · ' : '' }}{{ timing }}</span>
        </p>
        <pre
          v-if="cue.status === 'generating' && streamingCode"
          class="font-mono text-[11px] leading-snug text-ink-dim mt-2 whitespace-pre-wrap max-h-32 overflow-hidden">{{ streamingCode }}<span class="animate-pulse">▍</span></pre>
        <ul
          v-if="cue.errors.length && (cue.status === 'failed' || open)"
          class="text-xs text-fail mt-1.5 space-y-0.5"
        >
          <li v-for="e in cue.errors" :key="e">{{ e }}</li>
        </ul>
        <pre
          v-if="open && cue.code"
          class="font-mono text-[11px] leading-snug mt-2 max-h-64 overflow-auto scroll-thin whitespace-pre-wrap"
        ><span
          v-for="(line, i) in diff"
          :key="i"
          class="block"
          :class="line.type === 'add' ? 'text-amber' : line.type === 'del' ? 'text-ink-faint line-through' : 'text-ink-dim'"
        >{{ line.text || ' ' }}</span></pre>
      </div>
      <button
        v-if="cue.status === 'generating'"
        class="shrink-0 -mr-1 size-7 rounded text-sm text-ink-faint hover:text-ink hover:bg-white/5"
        aria-label="Cancel"
        title="Cancel (Esc)"
        @click="director.cancel(cue.id)"
      >
        ✕
      </button>
    </div>

    <!-- v-if, not :empty: Vue leaves comment nodes for each false v-if, so :empty never matches. -->
    <div v-if="hasActions" class="flex gap-1.5 mt-2 pl-11">
      <button
        v-if="cue.status === 'ready' || (cue.status === 'idea' && cue.code)"
        class="h-7 px-3 rounded bg-armed/90 text-[#0b0b22] text-sm font-bold hover:bg-armed"
        @click="cue.status === 'idea' ? deck.playIdea(cue.id) : deck.launch(cue.id, { quantize: 'next_bar' })"
      >
        Go
      </button>
      <button
        v-if="cue.status === 'ready'"
        class="h-7 px-3 rounded border border-line text-sm text-ink-dim hover:text-ink"
        @click="deck.launch(cue.id, { quantize: 'next_phrase' })"
      >
        Phrase
      </button>
      <button
        v-if="cue.status === 'queued'"
        class="h-7 px-3 rounded border border-line text-sm text-ink-dim hover:text-ink"
        @click="deck.cancel(cue.id)"
      >
        Hold
      </button>
      <button
        v-if="cue.status === 'played'"
        class="h-7 px-3 rounded border border-line text-sm text-ink-dim hover:text-ink"
        @click="deck.recall(cue.id)"
      >
        Again
      </button>
      <button
        v-if="cue.status === 'ready' || cue.status === 'failed'"
        class="h-7 px-2 rounded text-sm text-ink-faint hover:text-ink"
        aria-label="Discard"
        title="Discard"
        @click="deck.discard(cue.id)"
      >
        ✕
      </button>
    </div>
  </article>
</template>
