<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { __pianoroll, getDrawOptions } from '@strudel/draw'
import { getAnalyzerData } from '@strudel/webaudio'
// hydra-synth's package exports hide its UMD bundle, so point at the file directly.
import hydraUrl from '../../node_modules/hydra-synth/dist/hydra-synth.js?url'
import { engine } from '@/engine/engine'
import { useDeck } from '@/stores/deck'
import { useVisuals } from '@/stores/visuals'

/** Claude's stage: background, a visualiser or Hydra sketch, and big overlay text, behind the code. */
const visuals = useVisuals()
const deck = useDeck()
const canvas = ref<HTMLCanvasElement>()
const hydraCanvas = ref<HTMLCanvasElement>()

watchEffect(() => document.documentElement.style.setProperty('--stage-accent', visuals.accent))

const size = (el: HTMLCanvasElement | undefined, scale = window.devicePixelRatio || 1) => {
  if (!el) return
  const width = Math.round(el.clientWidth * scale)
  const height = Math.round(el.clientHeight * scale)
  if (el.width !== width || el.height !== height) {
    el.width = width
    el.height = height
  }
}

const drawScope = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  let data: Float32Array
  try {
    data = getAnalyzerData('time', 1)
  } catch {
    return
  }
  if (!data?.length) return
  ctx.lineWidth = Math.max(2, h / 220)
  ctx.strokeStyle = visuals.accent
  ctx.globalAlpha = 0.32
  ctx.beginPath()
  const step = w / data.length
  for (let i = 0; i < data.length; i++) {
    const y = h * 0.8 - data[i]! * h * 0.18
    if (i === 0) ctx.moveTo(0, y)
    else ctx.lineTo(i * step, y)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
}

const drawSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  let data: Float32Array
  try {
    data = getAnalyzerData('frequency', 1)
  } catch {
    return
  }
  if (!data?.length) return
  const bins = Math.min(data.length, 160)
  const bar = w / bins
  ctx.fillStyle = visuals.accent
  ctx.globalAlpha = 0.2
  for (let i = 0; i < bins; i++) {
    // Log-ish spread so bass doesn't hog the screen.
    const index = Math.floor((i / bins) ** 2 * data.length)
    const value = Math.max(0, Math.min(1, (data[index]! + 110) / 90))
    ctx.fillRect(i * bar, h - value * h * 0.5, bar * 0.8, value * h * 0.5)
  }
  ctx.globalAlpha = 1
}

const drawRoll = (ctx: CanvasRenderingContext2D, fold: number) => {
  const { now, haps } = engine.hapsAround({ behind: 2, ahead: 2 })
  ctx.globalAlpha = 0.3
  __pianoroll({
    ctx,
    time: now,
    haps: haps.filter((hap) => hap.whole),
    ...getDrawOptions([-2, 2], {
      fold,
      active: visuals.accent,
      inactive: `${visuals.accent}55`,
      playheadColor: visuals.accent,
      background: 'transparent'
    })
  })
  ctx.globalAlpha = 1
}

const drawSpiral = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const { now, haps } = engine.hapsAround({ behind: 1.5, ahead: 0 })
  const cx = w / 2
  const cy = h / 2
  const margin = Math.min(w, h) / 14
  ctx.strokeStyle = visuals.accent
  ctx.lineCap = 'round'
  for (const hap of haps) {
    if (!hap.whole) continue
    const start = hap.whole.begin.valueOf()
    const age = now - start
    if (age < 0 || age > 1.5) continue
    const angle = start * Math.PI * 2 - Math.PI / 2
    const radius = margin * (2 + age * 3)
    ctx.globalAlpha = 0.7 * (1 - age / 1.5)
    ctx.lineWidth = margin * 0.35
    ctx.beginPath()
    ctx.arc(cx, cy, radius, angle, angle + 0.18)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

let frame = 0
const draw = () => {
  frame = requestAnimationFrame(draw)
  const el = canvas.value
  if (!el) return
  size(el)
  const ctx = el.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, el.width, el.height)
  if (!engine.started) return
  const { width: w, height: h } = el
  if (visuals.mode === 'scope') drawScope(ctx, w, h)
  else if (visuals.mode === 'spectrum') drawSpectrum(ctx, w, h)
  else if (visuals.mode === 'pianoroll') drawRoll(ctx, 0)
  else if (visuals.mode === 'punchcard') drawRoll(ctx, 1)
  else if (visuals.mode === 'spiral') drawSpiral(ctx, w, h)
}

// Hydra is loaded on demand (its UMD bundle defines window.Hydra).
type HydraInstance = { hush(): void; setResolution(w: number, h: number): void }
let hydra: HydraInstance | undefined
const loadHydra = () =>
  new Promise<void>((resolve, reject) => {
    if ((window as unknown as { Hydra?: unknown }).Hydra) return resolve()
    const script = document.createElement('script')
    script.src = hydraUrl
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Hydra'))
    document.head.append(script)
  })

const runHydra = async (code: string) => {
  try {
    await loadHydra()
    size(hydraCanvas.value, 0.5)
    const Hydra = (window as unknown as { Hydra: new (o: Record<string, unknown>) => HydraInstance }).Hydra
    hydra ??= new Hydra({
      canvas: hydraCanvas.value,
      detectAudio: false,
      makeGlobal: true,
      autoLoop: true,
      width: hydraCanvas.value?.width,
      height: hydraCanvas.value?.height
    })
    // Claude-written sketch, run with hydra's globals (osc, noise, src, o0...).
    new Function(code)()
    visuals.hydraError = ''
  } catch (err) {
    visuals.hydraError = (err as Error).message
    deck.report(`hydra sketch failed: ${(err as Error).message}`)
  }
}

watch(
  () => [visuals.version, visuals.mode] as const,
  () => {
    if (visuals.mode === 'hydra' && visuals.hydra) void runHydra(visuals.hydra)
    else hydra?.hush()
  }
)

onMounted(() => (frame = requestAnimationFrame(draw)))
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <div
    class="fixed inset-0 transition-[background] duration-1000"
    :style="{ background: visuals.background }"
    aria-hidden="true"
  >
    <canvas
      v-show="visuals.mode === 'hydra'"
      ref="hydraCanvas"
      class="absolute inset-0 size-full opacity-55"
    />
    <canvas ref="canvas" class="absolute inset-0 size-full" />
    <div
      v-if="visuals.text"
      class="absolute inset-x-0 bottom-[22%] px-[6vw] expanded font-black leading-[0.85] text-[clamp(56px,11vw,220px)] opacity-25 select-none"
      :style="{ color: visuals.accent }"
    >
      {{ visuals.text }}
    </div>
  </div>
</template>
