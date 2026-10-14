<script setup lang="ts">
const props = defineProps<{ loading: string; ready: boolean; error: string }>()
const emit = defineEmits<{ start: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center px-[8vw] bg-[#07060b]/85 backdrop-blur-sm">
    <div class="max-w-2xl">
      <h1 class="expanded font-black text-[clamp(44px,7vw,104px)] leading-[0.9]">Claude Strudel</h1>
      <p class="mt-5 text-xl text-ink-dim leading-relaxed max-w-xl">
        You direct, Claude writes the code, and Strudel plays it on the bar. Say what the music should do and
        it happens.
      </p>
      <button
        class="mt-9 h-14 px-8 rounded-lg bg-live text-white expanded font-bold text-xl disabled:opacity-50 hover:brightness-110"
        :disabled="!props.ready"
        @click="emit('start')"
      >
        {{ props.ready ? 'Start the show' : 'Loading sounds…' }}
      </button>
      <p class="mt-4 text-sm text-ink-faint h-5">
        {{ props.error || (props.ready ? 'Audio starts when you click.' : props.loading) }}
      </p>
    </div>
  </div>
</template>
