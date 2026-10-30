<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const notFound = computed(() => props.error.statusCode === 404)
const offline = computed(() => props.error.statusCode === 503)
useHead({ title: notFound.value ? 'Not found' : 'Error' })

// Reloading re-runs auth and workspace loading from scratch, which is what a retry needs.
const retry = () => window.location.reload()
</script>

<template>
  <UApp>
    <div class="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <UIcon :name="notFound ? 'i-lucide-map-pin-off' : offline ? 'i-lucide-wifi-off' : 'i-lucide-triangle-alert'" class="size-10 text-muted" />
      <h1 class="text-xl font-semibold text-highlighted">
        {{ notFound ? 'Page not found' : offline ? 'Cannot load your workspace' : 'Something went wrong' }}
      </h1>
      <p class="max-w-md text-sm text-muted">
        {{ notFound ? 'The page you are looking for does not exist.' : error.statusMessage || error.message }}
      </p>
      <UButton v-if="offline" label="Try again" icon="i-lucide-refresh-cw" @click="retry" />
      <UButton v-else label="Go to the dashboard" @click="clearError({ redirect: '/' })" />
    </div>
  </UApp>
</template>
