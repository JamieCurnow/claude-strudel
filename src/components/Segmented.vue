<script setup lang="ts" generic="T extends string | number">
import { useId } from 'vue'

/** A row of pill buttons that behaves as a radio group (arrow keys move between options). */
defineProps<{ options: { value: T; label: string; hint?: string }[]; label?: string }>()
const model = defineModel<T>({ required: true })
const name = useId()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2" role="radiogroup" :aria-label="label">
    <span v-if="label" class="text-sm text-ink-dim w-24">{{ label }}</span>
    <label
      v-for="option in options"
      :key="option.value"
      class="rounded-md border px-3 py-1 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-amber"
      :class="
        model === option.value
          ? 'border-amber text-ink bg-amber/10'
          : 'border-line text-ink-dim hover:text-ink hover:border-ink-faint'
      "
    >
      <input v-model="model" class="sr-only" type="radio" :name="name" :value="option.value" />{{
        option.label
      }}<span v-if="option.hint" class="ml-1.5 text-ink-faint">{{ option.hint }}</span>
    </label>
  </div>
</template>
