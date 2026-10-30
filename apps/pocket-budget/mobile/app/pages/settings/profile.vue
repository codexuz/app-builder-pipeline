<script setup lang="ts">
const { user, updatePassword, signOut } = useAuth()
const notify = useNotify()
const sb = useSupabase()
const fullName = ref('')
const password = ref('')
const saving = ref(false)

onMounted(async () => {
  const { data } = await sb.from('profiles').select('full_name').eq('id', user.value!.id).single()
  fullName.value = data?.full_name ?? ''
})

async function saveName() {
  if (!fullName.value.trim()) return notify.toast('Enter your name', 'danger')
  saving.value = true
  const { error } = await sb.from('profiles').update({ full_name: fullName.value.trim() }).eq('id', user.value!.id)
  if (!error) await sb.auth.updateUser({ data: { full_name: fullName.value.trim() } })
  saving.value = false
  if (error) await notify.error('Could not save', error)
  else await notify.toast('Profile saved', 'success')
}

async function changePassword() {
  if (password.value.length < 8) return notify.toast('Use at least 8 characters', 'danger')
  try {
    await updatePassword(password.value)
    password.value = ''
    await notify.toast('Password changed', 'success')
  } catch (err: any) {
    await notify.toast(err?.message ?? 'Could not change password', 'danger')
  }
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Profile</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-list-header><ion-label>{{ user?.email }}</ion-label></ion-list-header>
        <ion-item>
          <ion-input v-model="fullName" label="Full name" label-placement="stacked" autocomplete="name" />
          <ion-button slot="end" fill="clear" :disabled="saving" @click="saveName">Save</ion-button>
        </ion-item>
      </ion-list>
      <ion-list>
        <ion-list-header><ion-label>Password</ion-label></ion-list-header>
        <ion-item>
          <ion-input v-model="password" label="New password" label-placement="stacked" type="password" autocomplete="new-password" />
          <ion-button slot="end" fill="clear" :disabled="!password" @click="changePassword">Change</ion-button>
        </ion-item>
      </ion-list>
      <div class="ion-padding">
        <ion-button expand="block" fill="outline" color="medium" @click="signOut()">Sign out</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>
