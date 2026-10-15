<script setup lang="ts">
/** Power switch: browsers only allow audio after a gesture, so the instrument starts on a press. */
const props = defineProps<{ loading: string; ready: boolean; error: string }>()
const emit = defineEmits<{ start: [] }>()
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-12 bg-[#07060b]/90 backdrop-blur-sm"
  >
    <h1 class="expanded font-black text-[clamp(44px,8vw,120px)] leading-none tracking-tight">StrudelClaw</h1>
    <button
      class="group relative size-28 rounded-full grid place-items-center transition-[transform,opacity] disabled:opacity-40 enabled:hover:scale-105"
      :disabled="!props.ready"
      :aria-label="props.ready ? 'Start' : 'Loading'"
      @click="emit('start')"
    >
      <span
        class="absolute inset-0 rounded-full border-2"
        :class="props.ready ? 'border-live animate-[pulse_2.4s_ease-in-out_infinite]' : 'border-ink-faint/40'"
        aria-hidden="true"
      />
      <span
        v-if="!props.ready && !props.error"
        class="absolute inset-0 rounded-full border-2 border-transparent border-t-ink-dim animate-spin"
        aria-hidden="true"
      />
      <svg viewBox="0 0 24 24" class="size-10 ml-1 fill-live" aria-hidden="true">
        <path d="M7 4.5v15l13-7.5z" />
      </svg>
    </button>
    <p v-if="props.error" class="absolute bottom-10 text-sm text-fail" role="alert">{{ props.error }}</p>
    <span class="sr-only" aria-live="polite">{{ props.ready ? '' : props.loading }}</span>
  </div>
</template>
