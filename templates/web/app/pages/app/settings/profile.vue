<script setup lang="ts">
import * as z from 'zod'

useHead({ title: 'Profile' })
const { user, updatePassword, signOut } = useAuth()
const sb = useSupabase()
const toast = useToast()

const profile = reactive({ full_name: '', avatar_url: '' })
const passwords = reactive({ password: '', confirm: '' })
const saving = ref(false)
const changing = ref(false)

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Enter your name').max(120),
  avatar_url: z.union([z.literal(''), z.string().regex(/^https:\/\/\S+$/, 'Use an https:// image link')])
})
const passwordSchema = z.object({ password: z.string().min(8, 'Use at least 8 characters'), confirm: z.string() })
  .refine(v => v.password === v.confirm, { message: 'Passwords do not match', path: ['confirm'] })

onMounted(async () => {
  const { data } = await sb.from('profiles').select('full_name, avatar_url').eq('id', user.value!.id).single()
  profile.full_name = data?.full_name ?? ''
  profile.avatar_url = data?.avatar_url ?? ''
})

async function saveProfile() {
  saving.value = true
  const { error } = await sb.from('profiles')
    .update({ full_name: profile.full_name.trim(), avatar_url: profile.avatar_url || null })
    .eq('id', user.value!.id)
  if (!error) await sb.auth.updateUser({ data: { full_name: profile.full_name.trim() } })
  saving.value = false
  toast.add(error
    ? { title: 'Could not save profile', description: friendlyError(error), color: 'error' }
    : { title: 'Profile saved', color: 'success' })
}

async function changePassword() {
  changing.value = true
  try {
    await updatePassword(passwords.password)
    passwords.password = ''
    passwords.confirm = ''
    toast.add({ title: 'Password changed', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Could not change password', description: err?.message, color: 'error' })
  } finally {
    changing.value = false
  }
}
</script>

<template>
  <UDashboardPanel id="settings-profile">
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
        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">Profile</h2>
            <p class="text-sm text-muted">{{ user?.email }}</p>
          </template>
          <UForm :schema="profileSchema" :state="profile" class="space-y-4" @submit="saveProfile">
            <UFormField name="full_name" label="Full name">
              <UInput v-model="profile.full_name" class="w-full" />
            </UFormField>
            <UFormField name="avatar_url" label="Avatar URL" hint="Optional">
              <div class="flex items-center gap-3">
                <UAvatar :src="profile.avatar_url || undefined" :alt="profile.full_name" size="md" />
                <UInput v-model="profile.avatar_url" placeholder="https://…" class="flex-1" />
              </div>
            </UFormField>
            <div class="flex justify-end">
              <UButton type="submit" label="Save profile" :loading="saving" />
            </div>
          </UForm>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold text-highlighted">Password</h2>
          </template>
          <UForm :schema="passwordSchema" :state="passwords" class="space-y-4" @submit="changePassword">
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField name="password" label="New password">
                <UInput v-model="passwords.password" type="password" autocomplete="new-password" class="w-full" />
              </UFormField>
              <UFormField name="confirm" label="Confirm password">
                <UInput v-model="passwords.confirm" type="password" autocomplete="new-password" class="w-full" />
              </UFormField>
            </div>
            <div class="flex justify-end">
              <UButton type="submit" label="Change password" color="neutral" variant="outline" :loading="changing" />
            </div>
          </UForm>
        </UCard>

        <div class="flex justify-end">
          <UButton label="Sign out" icon="i-lucide-log-out" color="neutral" variant="ghost" @click="signOut()" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
