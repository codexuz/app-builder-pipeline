<script setup lang="ts">
import * as z from 'zod'

useHead({ title: 'Workspace settings' })
const ws = useWorkspace()
const { hasRole } = usePermissions()
const sb = useSupabase()
const toast = useToast()

const state = reactive({ name: ws.current.value?.name ?? '' })
const confirmName = ref('')
const saving = ref(false)
const deleting = ref(false)
const schema = z.object({ name: z.string().trim().min(1, 'Name your workspace').max(120) })

async function rename() {
  saving.value = true
  const { data, error } = await sb.from('organizations').update({ name: state.name.trim() }).eq('id', ws.current.value!.id).select('id')
  saving.value = false
  if (error || !data?.length) return toast.add({ title: 'Could not rename', description: friendlyError(error ?? { code: '42501' }), color: 'error' })
  await ws.load()
  toast.add({ title: 'Workspace renamed', color: 'success' })
}

async function destroy() {
  deleting.value = true
  const { data, error } = await sb.from('organizations').delete().eq('id', ws.current.value!.id).select('id')
  deleting.value = false
  if (error || !data?.length) return toast.add({ title: 'Could not delete', description: friendlyError(error ?? { code: '42501' }), color: 'error' })
  await ws.load()
  toast.add({ title: 'Workspace deleted', color: 'success' })
  await navigateTo(ws.current.value ? '/app' : '/app/onboarding')
}
</script>

<template>
  <UDashboardPanel id="settings-workspace">
    <template #header>
      <UDashboardNavbar title="Settings" icon="i-lucide-settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <SettingsNav />
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-2xl space-y-6">
        <UAlert v-if="!hasRole('admin')" icon="i-lucide-lock" color="neutral" variant="subtle" title="Only admins can change workspace settings" />
        <template v-else>
          <UCard>
            <template #header>
              <h2 class="font-semibold text-highlighted">Workspace</h2>
            </template>
            <UForm :schema="schema" :state="state" class="flex flex-col gap-4 sm:flex-row sm:items-start" @submit="rename">
              <UFormField name="name" label="Name" class="flex-1">
                <UInput v-model="state.name" class="w-full" />
              </UFormField>
              <UButton type="submit" label="Save" :loading="saving" class="sm:mt-6" />
            </UForm>
          </UCard>

          <UCard v-if="hasRole('owner') && !ws.current.value?.personal" :ui="{ root: 'ring-error/40' }">
            <template #header>
              <h2 class="font-semibold text-error">Delete workspace</h2>
              <p class="text-sm text-muted">Permanently deletes every record and file in {{ ws.current.value?.name }}. This cannot be undone.</p>
            </template>
            <div class="flex flex-col gap-3 sm:flex-row">
              <UInput v-model="confirmName" :placeholder="`Type ${ws.current.value?.name} to confirm`" class="flex-1" />
              <UButton label="Delete workspace" color="error" :disabled="confirmName !== ws.current.value?.name" :loading="deleting" @click="destroy" />
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
