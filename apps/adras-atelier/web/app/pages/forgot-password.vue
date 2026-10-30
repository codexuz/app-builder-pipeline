<script setup lang="ts">
import * as z from 'zod'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Reset password' })

const { sendPasswordReset } = useAuth()
const toast = useToast()
const state = reactive({ email: '' })
const sent = ref(false)
const loading = ref(false)
const schema = z.object({ email: z.email('Enter a valid email address') })

async function onSubmit() {
  loading.value = true
  try {
    await sendPasswordReset(state.email)
    sent.value = true
  } catch (err: any) {
    toast.add({ title: 'Could not send the email', description: err?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold text-highlighted">Reset your password</h1>
      <p class="text-sm text-muted">
        {{ sent ? `If an account exists for ${state.email}, a reset link is on its way.` : 'We will email you a link to choose a new password.' }}
      </p>
    </div>
    <UForm v-if="!sent" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField name="email" label="Email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UButton type="submit" block :loading="loading" label="Send reset link" />
    </UForm>
    <UButton to="/login" variant="link" icon="i-lucide-arrow-left" label="Back to sign in" class="p-0" />
  </div>
</template>
