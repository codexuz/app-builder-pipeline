<script setup lang="ts">
import { app } from '#core/schema'

const { lang } = useLang()
useHead({ title: app.name })
// The native shell has one document, so the language and style go straight on it.
onMounted(() => {
  document.documentElement.dataset.style = app.style
  watchEffect(() => { document.documentElement.lang = lang.value })
})

const route = useRouter().currentRoute
const { user } = useAuth()
const { current } = useWorkspace()
// Public pages always have the menu; the workspace area needs someone signed in with a workspace.
const showMenu = computed(() => {
  const path = route.value.path
  if (AUTH_ROUTES.has(path) || path.startsWith('/invite/')) return false
  return inWorkspaceArea(path) ? Boolean(user.value && current.value) : app.publicSite
})
</script>

<template>
  <ion-app>
    <ion-split-pane content-id="main" when="lg">
      <AppMenu :disabled="!showMenu" />
      <ion-router-outlet id="main" />
    </ion-split-pane>
  </ion-app>
</template>
