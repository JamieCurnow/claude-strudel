<script setup lang="ts">
import { EFFORTS, MODELS } from '#shared/director'
import { useDirector } from '@/stores/director'
import { useSettings } from '@/stores/settings'
import Segmented from './Segmented.vue'
import StatsPanel from './StatsPanel.vue'

const emit = defineEmits<{ close: [] }>()
const { settings } = useSettings()
const director = useDirector()

const newSet = () => {
  if (confirm('Start a new set? This clears the cues and Claude forgets the conversation.')) {
    director.newSet()
    emit('close')
  }
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex justify-end bg-black/40" @click.self="emit('close')">
    <aside
      class="bg-glass-strong backdrop-blur-xl h-full w-full max-w-lg overflow-y-auto scroll-thin p-6 space-y-7 border-l border-line"
      aria-label="Settings"
    >
      <div class="flex items-center justify-between">
        <h2 class="expanded font-bold text-2xl">Settings</h2>
        <button
          class="h-9 px-3 rounded-md text-ink-dim hover:text-ink hover:bg-white/5"
          @click="emit('close')"
        >
          Close
        </button>
      </div>

      <fieldset class="space-y-2">
        <legend class="font-semibold mb-1">Model</legend>
        <Segmented v-model="settings.model" :options="MODELS.map((m) => ({ value: m.id, label: m.label }))" />
        <Segmented
          v-model="settings.effort"
          label="Effort"
          :options="EFFORTS.map((e) => ({ value: e, label: e }))"
        />
        <label class="flex items-center gap-3 text-sm text-ink-dim pt-1">
          <input
            v-model="settings.fast"
            class="switch"
            type="checkbox"
            :disabled="settings.model !== 'claude-opus-5-5'"
          />
          <span>Fast <span class="text-ink-faint">Opus · 2× cost</span></span>
        </label>
      </fieldset>

      <fieldset class="space-y-2">
        <legend class="font-semibold mb-1">Edits</legend>
        <Segmented
          v-model="settings.editMode"
          :options="[
            { value: 'blocks', label: 'Blocks', hint: 'changed only' },
            { value: 'full', label: 'Full', hint: 'whole program' }
          ]"
        />
      </fieldset>

      <fieldset class="space-y-2">
        <legend class="font-semibold mb-1">Launch</legend>
        <Segmented
          v-model="settings.launchMode"
          :options="[
            { value: 'auto', label: 'Auto', hint: 'on cue' },
            { value: 'arm', label: 'Arm', hint: 'wait for GO' }
          ]"
        />
        <Segmented
          v-model="settings.goQuantize"
          label="GO lands"
          :options="[
            { value: 'next_bar', label: 'next bar' },
            { value: 'next_phrase', label: 'next phrase' }
          ]"
        />
        <Segmented
          v-model="settings.phraseBars"
          label="Phrase"
          :options="[4, 8, 16].map((bars) => ({ value: bars, label: `${bars} bars` }))"
        />
      </fieldset>

      <fieldset class="space-y-2">
        <legend class="font-semibold mb-1">Ideas</legend>
        <Segmented
          v-model="settings.ideas"
          label="Write ahead"
          :options="[0, 1, 2, 3].map((n) => ({ value: n, label: n ? String(n) : 'off' }))"
        />
        <label class="flex items-center gap-3 text-sm text-ink-dim pt-1">
          <input v-model="settings.autoRepair" class="switch" type="checkbox" /> Auto-fix failed code
        </label>
      </fieldset>

      <fieldset class="space-y-2">
        <legend class="font-semibold mb-1">Access</legend>
        <input
          v-model="settings.password"
          type="password"
          class="w-full bg-black/50 border border-line rounded px-3 py-2 text-sm"
          placeholder="Password"
        />
      </fieldset>

      <StatsPanel />

      <div class="pt-2 border-t border-line">
        <button class="h-9 px-4 rounded-md border border-fail/50 text-fail hover:bg-fail/10" @click="newSet">
          New set
        </button>
      </div>
    </aside>
  </div>
</template>
