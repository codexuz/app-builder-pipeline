<script setup lang="ts">
import { app } from '#core/schema'

useHead({ title: app.name, htmlAttrs: { lang: app.locale.split('-')[0] } })

const route = useRouter().currentRoute
const { user } = useAuth()
const { current } = useWorkspace()
// The menu only exists once someone is signed in and inside a workspace.
const showMenu = computed(() => Boolean(user.value && current.value) && !AUTH_ROUTES.has(route.value.path) && !route.value.path.startsWith('/invite/'))
</script>

<template>
  <ion-app>
    <ion-split-pane content-id="main" when="lg">
      <AppMenu :disabled="!showMenu" />
      <ion-router-outlet id="main" />
    </ion-split-pane>
  </ion-app>
</template>
