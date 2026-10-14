<script setup lang="ts">
import { ref } from 'vue'
const health = ref('...')
fetch('/api/health').then(async (r) => (health.value = await r.text()))
</script>

<template>
  <main>claude-strudel {{ health }}</main>
</template>
