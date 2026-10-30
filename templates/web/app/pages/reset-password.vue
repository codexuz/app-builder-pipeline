<script setup lang="ts">
import * as z from 'zod'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Choose a new password' })

const { updatePassword } = useAuth()
const toast = useToast()
const state = reactive({ password: '', confirm: '' })
const loading = ref(false)
const schema = z.object({
  password: z.string().min(8, 'Use at least 8 characters'),
  confirm: z.string()
}).refine(v => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })

async function onSubmit() {
  loading.value = true
  try {
    await updatePassword(state.password)
    toast.add({ title: 'Password updated', color: 'success' })
    await navigateTo('/')
  } catch (err: any) {
    toast.add({ title: 'Could not update password', description: err?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <h1 class="text-lg font-semibold text-highlighted">Choose a new password</h1>
    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField name="password" label="New password">
        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>
      <UFormField name="confirm" label="Confirm password">
        <UInput v-model="state.confirm" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>
      <UButton type="submit" block :loading="loading" label="Update password" />
    </UForm>
  </div>
</template>
