<script setup lang="ts">
import { app, entities } from '#core/schema'

definePageMeta({ layout: 'site' })
useHead({ title: 'Your account' })

const { user, signOut } = useAuth()
const ws = useWorkspace()
const toast = useToast()
const sb = useSupabase()
const fullName = ref('')
const saving = ref(false)
const mine = entities.filter(e => e.access === 'customer' && !e.publicRead)

onMounted(async () => {
  const { data } = await sb.from('profiles').select('full_name').eq('id', user.value!.id).maybeSingle()
  fullName.value = data?.full_name ?? ''
  if (!ws.loaded.value) await ws.load().catch(() => {})
})

async function save() {
  saving.value = true
  const { error } = await sb.from('profiles').update({ full_name: fullName.value.trim() }).eq('id', user.value!.id)
  if (!error) await sb.auth.updateUser({ data: { full_name: fullName.value.trim() } })
  saving.value = false
  toast.add(error
    ? { title: 'Could not save', description: friendlyError(error), color: 'error' }
    : { title: 'Saved', color: 'success' })
}
</script>

<template>
  <UContainer class="max-w-2xl space-y-6 py-8">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">Your account</h1>
      <p class="text-sm text-muted">{{ user?.email }}</p>
    </div>

    <UCard v-if="mine.length" :ui="{ body: 'p-0 sm:p-0' }">
      <ul class="divide-y divide-default">
        <li v-for="e in mine" :key="e.name">
          <NuxtLink :to="`/${e.slug}`" class="flex items-center gap-3 p-4 hover:bg-elevated/50">
            <UIcon :name="e.icon" class="size-5 text-muted" />
            <span class="flex-1 text-highlighted">Your {{ e.plural.toLowerCase() }}</span>
            <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed" />
          </NuxtLink>
        </li>
      </ul>
    </UCard>

    <UCard>
      <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="save">
        <UFormField label="Full name" class="flex-1">
          <UInput v-model="fullName" class="w-full" autocomplete="name" />
        </UFormField>
        <UButton type="submit" label="Save" :loading="saving" />
      </form>
    </UCard>

    <div class="flex flex-wrap justify-between gap-2">
      <UButton v-if="ws.current.value" to="/app" label="Open the staff area" icon="i-lucide-layout-dashboard" color="neutral" variant="outline" />
      <UButton v-else-if="app.type === 'marketplace'" to="/app/onboarding" :label="`Sell on ${app.name}`" icon="i-lucide-store" color="neutral" variant="outline" />
      <UButton label="Sign out" icon="i-lucide-log-out" color="neutral" variant="ghost" class="ms-auto" @click="signOut()" />
    </div>
  </UContainer>
</template>
