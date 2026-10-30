<script setup lang="ts">
import * as z from 'zod'
import { app } from '#core/schema'

definePageMeta({ layout: 'auth' })
const words = app.type === 'business'
  ? { title: 'Set up your business', name: 'Business name', hint: 'This creates the one workspace for your shop or company. Everyone who signs up later is a customer.', cta: 'Create business' }
  : app.type === 'marketplace'
    ? { title: 'Open your shop', name: 'Shop name', hint: `Your shop name is public. You can add products and invite staff next.`, cta: 'Open shop' }
    : { title: 'Create your workspace', name: 'Workspace name', hint: 'A workspace holds your team\'s data. You can invite people once it exists. Joining a team? Open the invite link you were sent.', cta: 'Create workspace' }
useHead({ title: words.title })

const route = useRoute()
const ws = useWorkspace()
const { signOut } = useAuth()
const toast = useToast()
const state = reactive({ name: '' })
const loading = ref(false)
const schema = z.object({ name: z.string().trim().min(1, 'Name your workspace').max(120) })
const adding = computed(() => route.query.new === '1' && ws.list.value.length > 0)

async function onSubmit() {
  loading.value = true
  try {
    await ws.create(state.name.trim())
    await navigateTo('/app')
  } catch (err) {
    toast.add({ title: 'Could not create the workspace', description: friendlyError(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold text-highlighted">{{ adding ? 'New workspace' : words.title }}</h1>
      <p class="text-sm text-muted">
        {{ words.hint }}
      </p>
    </div>
    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField name="name" :label="words.name">
        <UInput v-model="state.name" autofocus class="w-full" />
      </UFormField>
      <UButton type="submit" block :loading="loading" :label="words.cta" />
    </UForm>
    <div class="flex justify-between">
      <UButton v-if="adding" to="/" variant="link" icon="i-lucide-arrow-left" label="Back" class="p-0" />
      <UButton v-else variant="link" color="neutral" label="Sign out" class="p-0" @click="signOut()" />
    </div>
  </div>
</template>
