<script setup lang="ts">
import { app } from '#core/schema'

const route = useRouter().currentRoute.value
const words = app.type === 'business'
  ? { title: 'Set up your business', name: 'Business name', hint: 'This creates the one workspace for your shop or company. Everyone who signs up later is a customer.', cta: 'Create business' }
  : app.type === 'marketplace'
    ? { title: 'Open your shop', name: 'Shop name', hint: `Your shop name is public. You can add products and invite staff next.`, cta: 'Open shop' }
    : { title: 'Create your workspace', name: 'Workspace name', hint: 'A workspace holds your team\'s data. You can invite people once it exists. Joining a team? Open the invite link you were sent.', cta: 'Create workspace' }
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
    router.navigate('/app', 'root', 'replace')
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
          <ion-back-button default-href="/app/settings" />
        </ion-buttons>
        <ion-title>New workspace</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form class="auth-wrap" :style="adding ? 'padding-top: 0' : ''" @submit.prevent="submit">
        <h1 v-if="!adding">{{ words.title }}</h1>
        <p class="muted">{{ words.hint }}</p>
        <ion-list>
          <ion-item>
            <ion-input v-model="name" :label="words.name" label-placement="stacked" />
          </ion-item>
          <span v-if="error" class="field-error">{{ error }}</span>
        </ion-list>
        <ion-button type="submit" expand="block" class="ion-margin-top" :disabled="loading">{{ words.cta }}</ion-button>
        <ion-button v-if="!adding" fill="clear" color="medium" expand="block" @click="signOut()">Sign out</ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>
