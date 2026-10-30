<script setup lang="ts">
const { updatePassword } = useAuth()
const notify = useNotify()
const router = useIonRouter()
const password = ref('')
const confirm = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = password.value.length < 8 ? 'Use at least 8 characters' : password.value !== confirm.value ? 'Passwords do not match' : ''
  if (error.value) return
  loading.value = true
  try {
    await updatePassword(password.value)
    await notify.toast('Password updated', 'success')
    router.navigate('/app', 'root', 'replace')
  } catch (err: any) {
    await notify.toast(err?.message ?? 'Could not update password', 'danger')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>New password</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form class="auth-wrap" style="padding-top: 0" @submit.prevent="submit">
        <ion-list>
          <ion-item>
            <ion-input v-model="password" label="New password" label-placement="stacked" type="password" autocomplete="new-password" />
          </ion-item>
          <ion-item>
            <ion-input v-model="confirm" label="Confirm password" label-placement="stacked" type="password" autocomplete="new-password" />
          </ion-item>
          <span v-if="error" class="field-error">{{ error }}</span>
        </ion-list>
        <ion-button type="submit" expand="block" class="ion-margin-top" :disabled="loading">Update password</ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>
