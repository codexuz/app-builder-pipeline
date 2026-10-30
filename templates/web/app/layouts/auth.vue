<script setup lang="ts">
import { app } from '#core/schema'
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
    <div class="flex items-center gap-2 text-lg font-semibold text-highlighted">
      <UIcon name="i-lucide-layers" class="size-6 text-primary" />
      {{ app.name }}
    </div>
    <UCard class="w-full max-w-sm">
      <slot />
    </UCard>
    <p v-if="app.description" class="max-w-sm text-center text-sm text-muted">
      {{ app.description }}
    </p>
  </div>
</template>
