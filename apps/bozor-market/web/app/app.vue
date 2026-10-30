<script setup lang="ts">
import { app } from '#core/schema'

useHead({
  titleTemplate: t => (t ? `${t} · ${app.name}` : app.name),
  meta: [{ name: 'description', content: app.description }],
  htmlAttrs: { lang: app.locale.split('-')[0] }
})
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right' }">
    <NuxtLoadingIndicator />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
