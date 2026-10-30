<script setup lang="ts">
import { app, entities } from '#core/schema'

const { user, signOut } = useAuth()
const ws = useWorkspace()
const notify = useNotify()
const sb = useSupabase()
const fullName = ref('')
const mine = entities.filter(e => e.access === 'customer' && !e.publicRead)

onMounted(async () => {
  const { data } = await sb.from('profiles').select('full_name').eq('id', user.value!.id).maybeSingle()
  fullName.value = data?.full_name ?? ''
  if (!ws.loaded.value) await ws.load().catch(() => {})
})

async function save() {
  const { error } = await sb.from('profiles').update({ full_name: fullName.value.trim() }).eq('id', user.value!.id)
  if (error) return notify.error('Could not save', error)
  await sb.auth.updateUser({ data: { full_name: fullName.value.trim() } })
  await notify.toast('Saved', 'success')
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>Your account</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list v-if="mine.length">
        <ion-item v-for="e in mine" :key="e.name" :router-link="`/${e.slug}`" button>
          <Icon :name="e.icon" slot="start" class="menu-icon" />
          <ion-label>Your {{ e.plural.toLowerCase() }}</ion-label>
        </ion-item>
      </ion-list>
      <ion-list>
        <ion-list-header><ion-label>{{ user?.email }}</ion-label></ion-list-header>
        <ion-item>
          <ion-input v-model="fullName" label="Full name" label-placement="stacked" autocomplete="name" />
          <ion-button slot="end" fill="clear" @click="save">Save</ion-button>
        </ion-item>
      </ion-list>
      <div class="ion-padding">
        <ion-button v-if="ws.current.value" expand="block" fill="outline" router-link="/app" router-direction="root">Open the staff area</ion-button>
        <ion-button v-else-if="app.type === 'marketplace'" expand="block" fill="outline" router-link="/app/onboarding">Sell on {{ app.name }}</ion-button>
        <ion-button expand="block" fill="clear" color="medium" @click="signOut()">Sign out</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>
