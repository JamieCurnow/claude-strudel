<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { engine } from '@/engine/engine'
import { diffLines } from '@/engine/program'
import { useDeck } from '@/stores/deck'

/**
 * The live program, big, with each mini-notation token lighting up as it plays (TOPLAP: show us your
 * screens). Token positions come from the events' source locations, so this only works for the code that
 * was actually evaluated (tempo lines stripped), which is what we show.
 */
const deck = useDeck()
const root = ref<HTMLElement>()
const code = computed(() => (deck.live ? (deck.evaluatedCode(deck.live.id) ?? deck.live.code) : ''))
const liveId = computed(() => deck.live?.id)

interface Piece {
  text: string
  start: number
  end: number
  token: boolean
}
interface Line {
  pieces: Piece[]
  fresh: boolean
}
const lines = ref<Line[]>([])
let tokenEls: { start: number; end: number; el: HTMLElement }[] = []
let previousCode = ''

/** Split the code into pieces at every location boundary any event points at. */
const layout = () => {
  const text = code.value
  const id = liveId.value
  const ranges = new Map<string, { start: number; end: number }>()
  if (id && text) {
    const { haps } = engine.hapsAround({ behind: 0, ahead: 8 })
    for (const hap of haps) {
      if (hap.context.moveId !== id) continue
      for (const loc of hap.context.locations ?? []) ranges.set(`${loc.start}:${loc.end}`, loc)
    }
  }
  // Labels (`amen:`) can pick up stray locations from the transpiler; never highlight inside a label.
  const labelEnds: [number, number][] = []
  let cursor = 0
  for (const line of text.split('\n')) {
    const label = /^[A-Za-z_$][\w$]*:/.exec(line)
    if (label) labelEnds.push([cursor, cursor + label[0].length])
    cursor += line.length + 1
  }
  for (const [key, range] of ranges) {
    if (labelEnds.some(([a, b]) => range.start < b && range.end > a)) ranges.delete(key)
  }
  const cuts = new Set<number>([0, text.length])
  for (const { start, end } of ranges.values()) {
    if (start >= 0 && end <= text.length) cuts.add(start).add(end)
  }
  let offset = 0
  const fresh = new Set(
    diffLines(previousCode, text)
      .filter((line) => line.type === 'add')
      .map((line) => line.text)
  )
  const sorted = [...cuts].sort((a, b) => a - b)
  const covered = (a: number, b: number) => [...ranges.values()].some((r) => r.start <= a && r.end >= b)
  lines.value = text.split('\n').map((lineText) => {
    const lineStart = offset
    const lineEnd = offset + lineText.length
    offset = lineEnd + 1
    const pieces: Piece[] = []
    const points = [lineStart, ...sorted.filter((c) => c > lineStart && c < lineEnd), lineEnd]
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i]!
      const end = points[i + 1]!
      if (end > start) pieces.push({ text: text.slice(start, end), start, end, token: covered(start, end) })
    }
    return { pieces, fresh: previousCode !== '' && fresh.has(lineText) && lineText.trim() !== '' }
  })
  previousCode = text
  void nextTick(() => {
    tokenEls = [...(root.value?.querySelectorAll<HTMLElement>('[data-start]') ?? [])].map((el) => ({
      start: Number(el.dataset.start),
      end: Number(el.dataset.end),
      el
    }))
  })
}

watch([code, liveId], layout)

let frame = 0
const paint = () => {
  frame = requestAnimationFrame(paint)
  if (!tokenEls.length || !engine.started) return
  const { now, haps } = engine.hapsAround({ behind: 0, ahead: 0.0001 })
  const active: { start: number; end: number }[] = []
  for (const hap of haps) {
    if (hap.context.moveId !== liveId.value || !hap.whole) continue
    if (hap.whole.begin.valueOf() > now || hap.whole.end.valueOf() <= now) continue
    for (const loc of hap.context.locations ?? []) active.push(loc)
  }
  for (const token of tokenEls) {
    const on = active.some((loc) => loc.start <= token.start && loc.end >= token.end)
    token.el.classList.toggle('on', on)
  }
}

onMounted(() => {
  layout()
  frame = requestAnimationFrame(paint)
})
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <section ref="root" class="relative h-full overflow-auto scroll-thin px-8 py-6" aria-label="Live code">
    <p v-if="!code" class="text-ink-dim max-w-md mt-[18vh] text-lg leading-relaxed">
      Nothing's playing yet. Say or type how the music should sound, like
      <span class="text-ink">"classic jungle, dark, heavy bassline"</span>, and Claude will write the first
      cue.
    </p>
    <pre
      v-else
      class="font-mono text-[clamp(13px,1.35vw,20px)] leading-[1.75] whitespace-pre-wrap break-words [text-shadow:0_1px_12px_rgb(0_0_0/0.85)]"
    ><div
      v-for="(line, i) in lines"
      :key="`${i}:${previousCode.length}`"
      class="rounded px-1 -mx-1"
      :class="{ 'line-fresh': line.fresh }"
    ><template v-for="piece in line.pieces" :key="piece.start"><span
      v-if="piece.token"
      class="tok"
      :data-start="piece.start"
      :data-end="piece.end"
    >{{ piece.text }}</span><template v-else>{{ piece.text }}</template></template>{{ line.pieces.length ? '' : ' ' }}</div></pre>
  </section>
</template>
