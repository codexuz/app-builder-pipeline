<script setup lang="ts">
import * as z from 'zod'

const { sendPasswordReset } = useAuth()
const notify = useNotify()
const email = ref('')
const sent = ref(false)
const loading = ref(false)
const error = ref('')

async function submit() {
  const ok = z.email().safeParse(email.value).success
  error.value = ok ? '' : 'Enter a valid email address'
  if (!ok) return
  loading.value = true
  try {
    await sendPasswordReset(email.value)
    sent.value = true
  } catch (err: any) {
    await notify.toast(err?.message ?? 'Could not send the email', 'danger')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/login" />
        </ion-buttons>
        <ion-title>Reset password</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="auth-wrap" style="padding-top: 0">
        <p v-if="sent">If an account exists for <strong>{{ email }}</strong>, a reset link is on its way.</p>
        <form v-else @submit.prevent="submit">
          <p class="muted">We will email you a link to choose a new password.</p>
          <ion-list>
            <ion-item>
              <ion-input v-model="email" label="Email" label-placement="stacked" type="email" inputmode="email" autocomplete="email" />
            </ion-item>
            <span v-if="error" class="field-error">{{ error }}</span>
          </ion-list>
          <ion-button type="submit" expand="block" class="ion-margin-top" :disabled="loading">Send reset link</ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>
