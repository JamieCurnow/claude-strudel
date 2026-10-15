<script setup lang="ts">
import { EFFORTS, MODELS } from '#shared/director'
import { useDirector } from '@/stores/director'
import { useSettings } from '@/stores/settings'
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
        <div class="flex flex-wrap gap-2">
          <label
            v-for="m in MODELS"
            :key="m.id"
            class="cursor-pointer rounded-md border px-3 py-1.5 text-sm"
            :class="
              settings.model === m.id ? 'border-amber text-ink bg-amber/10' : 'border-line text-ink-dim'
            "
          >
            <input v-model="settings.model" class="sr-only" type="radio" :value="m.id" />{{ m.label }}
          </label>
        </div>
        <div class="flex flex-wrap gap-2 items-center">
          <span class="text-sm text-ink-dim w-16">Effort</span>
          <label
            v-for="e in EFFORTS"
            :key="e"
            class="cursor-pointer rounded-md border px-3 py-1 text-sm"
            :class="settings.effort === e ? 'border-amber text-ink bg-amber/10' : 'border-line text-ink-dim'"
          >
            <input v-model="settings.effort" class="sr-only" type="radio" :value="e" />{{ e }}
          </label>
        </div>
        <label class="flex items-center gap-2 text-sm text-ink-dim">
          <input v-model="settings.fast" type="checkbox" :disabled="settings.model !== 'claude-opus-5-5'" />
          Fast <span class="text-ink-faint">Opus · 2× cost</span>
        </label>
      </fieldset>

      <fieldset class="space-y-2">
        <legend class="font-semibold mb-1">Edits</legend>
        <label class="flex gap-2 text-sm cursor-pointer">
          <input v-model="settings.editMode" type="radio" value="blocks" />
          <span
            ><span class="text-ink mr-1.5">Blocks</span
            ><span class="text-ink-faint">changed blocks only</span></span
          >
        </label>
        <label class="flex gap-2 text-sm cursor-pointer">
          <input v-model="settings.editMode" type="radio" value="full" />
          <span
            ><span class="text-ink mr-1.5">Full</span><span class="text-ink-faint">whole program</span></span
          >
        </label>
      </fieldset>

      <fieldset class="space-y-2">
        <legend class="font-semibold mb-1">Launch</legend>
        <label class="flex gap-2 text-sm cursor-pointer">
          <input v-model="settings.launchMode" type="radio" value="auto" />
          <span><span class="text-ink mr-1.5">Auto</span><span class="text-ink-faint">on cue</span></span>
        </label>
        <label class="flex gap-2 text-sm cursor-pointer">
          <input v-model="settings.launchMode" type="radio" value="arm" />
          <span><span class="text-ink mr-1.5">Arm</span><span class="text-ink-faint">wait for GO</span></span>
        </label>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-ink-dim w-28">GO lands</span>
          <select v-model="settings.goQuantize" class="bg-black/50 border border-line rounded px-2 py-1">
            <option value="next_bar">next bar</option>
            <option value="next_phrase">next phrase</option>
          </select>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-ink-dim w-28">Phrase</span>
          <select
            v-model.number="settings.phraseBars"
            class="bg-black/50 border border-line rounded px-2 py-1"
          >
            <option :value="4">4 bars</option>
            <option :value="8">8 bars</option>
            <option :value="16">16 bars</option>
          </select>
        </div>
      </fieldset>

      <fieldset class="space-y-2">
        <legend class="font-semibold mb-1">Ideas</legend>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-ink-dim">Write ahead</span>
          <select v-model.number="settings.ideas" class="bg-black/50 border border-line rounded px-2 py-1">
            <option :value="0">off</option>
            <option :value="1">1 idea</option>
            <option :value="2">2 ideas</option>
            <option :value="3">3 ideas</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-ink-dim">
          <input v-model="settings.autoRepair" type="checkbox" /> Auto-fix failed code
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
