<script setup lang="ts">
const route = useRouter().currentRoute.value
const router = useIonRouter()
const ws = useWorkspace()
const { signOut } = useAuth()
const notify = useNotify()
const name = ref('')
const error = ref('')
const loading = ref(false)
const adding = route.query.new === '1' && ws.list.value.length > 0

async function submit() {
  error.value = name.value.trim() ? '' : 'Name your workspace'
  if (error.value) return
  loading.value = true
  try {
    await ws.create(name.value.trim())
    router.navigate('/', 'root', 'replace')
  } catch (err) {
    await notify.error('Could not create the workspace', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-header v-if="adding">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/settings" />
        </ion-buttons>
        <ion-title>New workspace</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form class="auth-wrap" :style="adding ? 'padding-top: 0' : ''" @submit.prevent="submit">
        <h1 v-if="!adding">Create your workspace</h1>
        <p class="muted">A workspace holds your team's data. You can invite people once it exists. Joining a team? Open the invite link you were sent.</p>
        <ion-list>
          <ion-item>
            <ion-input v-model="name" label="Workspace name" label-placement="stacked" placeholder="Acme Inc." />
          </ion-item>
          <span v-if="error" class="field-error">{{ error }}</span>
        </ion-list>
        <ion-button type="submit" expand="block" class="ion-margin-top" :disabled="loading">Create workspace</ion-button>
        <ion-button v-if="!adding" fill="clear" color="medium" expand="block" @click="signOut()">Sign out</ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>
