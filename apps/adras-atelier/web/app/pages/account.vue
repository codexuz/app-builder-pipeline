<script setup lang="ts">
import { app, entities } from '#core/schema'

definePageMeta({ layout: 'site' })
useHead({ title: () => t('account.title') })

const { user, signOut } = useAuth()
const ws = useWorkspace()
const toast = useToast()
const sb = useSupabase()
const fullName = ref('')
const saving = ref(false)
const mine = entities.filter(e => e.access === 'customer' && !e.publicRead && e.nav)

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
    ? { title: t('form.failed'), description: friendlyError(error), color: 'error' }
    : { title: t('form.saved'), color: 'success' })
}
</script>

<template>
  <div class="site-section site-wrap max-w-2xl space-y-8">
    <div>
      <h1 class="site-title site-h1">{{ t('account.title') }}</h1>
      <p class="mt-1 text-muted">{{ user?.email }}</p>
    </div>

    <ul v-if="mine.length" class="rows">
      <li v-for="e in mine" :key="e.name">
        <NuxtLink :to="`/${e.slug}`" class="flex items-center gap-3 border-b border-default py-4 hover:text-primary">
          <UIcon :name="e.icon" class="size-5 text-muted" />
          <span class="flex-1 text-highlighted">{{ t('account.your', { name: tl(e.plural).toLowerCase() }) }}</span>
          <UIcon name="i-lucide-chevron-right" class="size-4 text-dimmed" />
        </NuxtLink>
      </li>
    </ul>

    <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="save">
      <UFormField :label="t('auth.name')" class="flex-1">
        <UInput v-model="fullName" class="w-full" autocomplete="name" />
      </UFormField>
      <UButton type="submit" :label="t('form.save')" :loading="saving" />
    </form>

    <div class="flex flex-wrap justify-between gap-2">
      <UButton v-if="ws.current.value" to="/app" :label="t('account.staff')" icon="i-lucide-layout-dashboard" color="neutral" variant="outline" />
      <UButton v-else-if="app.type === 'marketplace'" to="/app/onboarding" :label="t('account.sell', { name: app.name })" icon="i-lucide-store" color="neutral" variant="outline" />
      <UButton :label="t('auth.signOut')" icon="i-lucide-log-out" color="neutral" variant="ghost" class="ms-auto" @click="signOut()" />
    </div>
  </div>
</template>
