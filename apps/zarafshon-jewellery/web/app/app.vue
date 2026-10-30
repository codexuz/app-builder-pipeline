<script setup lang="ts">
import { app } from '#core/schema'

const { lang } = useLang()
useHead({
  titleTemplate: title => (title ? `${title} · ${app.name}` : app.name),
  meta: [{ name: 'description', content: app.description }],
  htmlAttrs: { 'lang': lang, 'data-style': app.style }
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
