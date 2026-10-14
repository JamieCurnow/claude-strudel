<script setup lang="ts">
import { computed } from 'vue'
import { useDeck } from '@/stores/deck'

/** Latency + accuracy per reply, grouped by model/mode so Full vs Blocks can be compared on real use. */
const deck = useDeck()

const rows = computed(() => {
  const groups = new Map<
    string,
    { label: string; n: number; total: number; ttft: number; tokens: number; repaired: number }
  >()
  const seen = new Set<string>()
  for (const cue of deck.cues) {
    const m = cue.metrics
    if (!m?.totalMs || cue.origin === 'idea' || (cue.replyId && seen.has(cue.replyId))) continue
    if (cue.replyId) seen.add(cue.replyId)
    const label = `${m.model.replace('claude-', '')} · ${m.mode}${m.fast ? ' · fast' : ''}`
    const group = groups.get(label) ?? { label, n: 0, total: 0, ttft: 0, tokens: 0, repaired: 0 }
    group.n++
    group.total += m.totalMs
    group.ttft += m.ttftMs ?? 0
    group.tokens += m.outputTokens ?? 0
    group.repaired += m.repaired ? 1 : 0
    groups.set(label, group)
  }
  return [...groups.values()]
})
</script>

<template>
  <section>
    <h3 class="font-semibold mb-2">Latency by setup</h3>
    <p v-if="!rows.length" class="text-sm text-ink-faint">
      Give a few directions and the averages show up here.
    </p>
    <table v-else class="w-full text-sm tabular-nums">
      <thead class="text-ink-faint text-left">
        <tr>
          <th class="font-normal py-1">Setup</th>
          <th class="font-normal">Replies</th>
          <th class="font-normal">First token</th>
          <th class="font-normal">Total</th>
          <th class="font-normal">Tokens</th>
          <th class="font-normal">Needed a fix</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.label" class="border-t border-line">
          <td class="py-1.5">{{ row.label }}</td>
          <td>{{ row.n }}</td>
          <td>{{ (row.ttft / row.n / 1000).toFixed(1) }}s</td>
          <td>{{ (row.total / row.n / 1000).toFixed(1) }}s</td>
          <td>{{ Math.round(row.tokens / row.n) }}</td>
          <td>{{ row.repaired }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
