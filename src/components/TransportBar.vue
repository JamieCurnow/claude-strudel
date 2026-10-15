<script setup lang="ts">
import { computed } from 'vue'
import { MODELS } from '#shared/director'
import { engine } from '@/engine/engine'
import { useClock } from '@/stores/clock'
import { useDirector } from '@/stores/director'
import { useSettings } from '@/stores/settings'

const emit = defineEmits<{ settings: []; stage: [] }>()
const clock = useClock()
const director = useDirector()
const { settings } = useSettings()

const model = computed(() => MODELS.find((m) => m.id === settings.model)?.label ?? settings.model)
const phraseCells = computed(() => Array.from({ length: clock.phraseBars }, (_, i) => i))

const toggle = async () => (clock.started ? engine.stop() : engine.start())
</script>

<template>
  <header class="flex items-center gap-5 px-5 h-14 glass border-b border-line select-none">
    <button
      class="flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-full border text-sm font-semibold tracking-wide transition-colors"
      :class="
        clock.started
          ? 'border-live/60 text-live bg-live/10 hover:bg-live/20'
          : 'border-line text-ink-dim hover:text-ink hover:border-ink-faint'
      "
      :aria-label="clock.started ? 'Stop the music' : 'Start the music'"
      @click="toggle"
    >
      <span class="size-2.5 rounded-full" :class="clock.started ? 'bg-live animate-pulse' : 'bg-ink-faint'" />
      {{ clock.started ? 'On air' : 'Stopped' }}
    </button>

    <div class="flex items-baseline gap-1.5" aria-label="Tempo">
      <span class="expanded text-2xl font-bold tabular-nums">{{ Math.round(clock.bpm) }}</span>
      <span class="text-ink-dim text-sm">bpm</span>
    </div>

    <div class="flex items-center gap-3" aria-label="Position">
      <div class="expanded text-2xl font-bold tabular-nums w-[5.5ch] text-right">{{ clock.bar }}</div>
      <div class="flex gap-1" aria-hidden="true">
        <span
          v-for="b in 4"
          :key="b"
          class="size-1.5 rounded-full"
          :class="clock.started && clock.beat === b - 1 ? 'bg-ink' : 'bg-ink-faint/50'"
        />
      </div>
      <div class="flex gap-0.5 ml-1" :title="`Phrase of ${clock.phraseBars} bars`">
        <span
          v-for="cell in phraseCells"
          :key="cell"
          class="h-5 w-2 rounded-sm"
          :class="cell <= clock.barInPhrase && clock.started ? 'bg-amber' : 'bg-ink-faint/30'"
        />
      </div>
    </div>

    <div class="ml-auto flex items-center gap-2 text-sm">
      <span
        v-if="director.busy"
        class="size-2.5 rounded-full bg-amber animate-pulse"
        role="status"
        aria-label="Claude is writing"
      />
      <span class="text-ink-faint hidden md:inline"
        >{{ model }} · {{ settings.editMode }} · {{ settings.launchMode }}</span
      >
      <button
        class="size-9 grid place-items-center rounded-md text-ink-dim hover:text-ink hover:bg-white/5"
        aria-label="Stage view (S)"
        title="Stage view (S)"
        @click="emit('stage')"
      >
        <svg viewBox="0 0 24 24" class="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round]">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
      <button
        class="size-9 grid place-items-center rounded-md text-ink-dim hover:text-ink hover:bg-white/5"
        aria-label="Settings"
        title="Settings"
        @click="emit('settings')"
      >
        <svg viewBox="0 0 24 24" class="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round]">
          <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="10" cy="12" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      </button>
    </div>
  </header>
</template>
