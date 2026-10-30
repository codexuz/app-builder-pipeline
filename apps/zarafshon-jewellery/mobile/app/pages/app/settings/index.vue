<script setup lang="ts">
const ws = useWorkspace()
const { hasRole } = usePermissions()
const notify = useNotify()
const router = useIonRouter()
const name = ref(ws.current.value?.name ?? '')
const saving = ref(false)

async function rename() {
  if (!name.value.trim()) return notify.toast('Name your workspace', 'danger')
  saving.value = true
  const { data, error } = await useSupabase().from('organizations').update({ name: name.value.trim() }).eq('id', ws.current.value!.id).select('id')
  saving.value = false
  if (error || !data?.length) return notify.error('Could not rename', error ?? { code: '42501' })
  await ws.load()
  await notify.toast('Workspace renamed', 'success')
}

function switchTo(id: string) {
  ws.select(id)
  router.navigate('/app', 'root', 'replace')
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Workspace</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list v-if="hasRole('admin')">
        <ion-list-header><ion-label>Name</ion-label></ion-list-header>
        <ion-item>
          <ion-input v-model="name" aria-label="Workspace name" />
          <ion-button slot="end" fill="clear" :disabled="saving" @click="rename">Save</ion-button>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header><ion-label>Your workspaces</ion-label></ion-list-header>
        <ion-item v-for="w in ws.list.value" :key="w.id" button :detail="false" @click="switchTo(w.id)">
          <ion-label>
            <h3>{{ w.name }}</h3>
            <p>{{ humanize(w.role) }}</p>
          </ion-label>
          <Icon v-if="w.id === ws.current.value?.id" slot="end" name="i-lucide-check" style="color: var(--ion-color-primary)" />
        </ion-item>
        <ion-item router-link="/app/onboarding?new=1" button>
          <Icon slot="start" name="i-lucide-plus" class="menu-icon" />
          <ion-label>New workspace</ion-label>
        </ion-item>
      </ion-list>
      <p class="ion-padding muted" style="font-size: 13px">Deleting a workspace is only possible in the web app.</p>
    </ion-content>
  </ion-page>
</template>
