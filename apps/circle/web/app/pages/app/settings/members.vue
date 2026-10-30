<script setup lang="ts">
import * as z from 'zod'
import { personName, roleAtLeast, type Profile, type Role } from '#core/utils/meta'

useHead({ title: 'Members' })
const ws = useWorkspace()
const { user } = useAuth()
const { hasRole } = usePermissions()
const sb = useSupabase()
const toast = useToast()
const confirm = useConfirm()

interface Member { user_id: string, role: Role, created_at: string, profiles: Profile }
interface Invite { id: string, email: string, role: Role, token: string, expires_at: string }
const members = ref<Member[]>([])
const invites = ref<Invite[]>([])
const loading = ref(true)
const inviting = ref(false)
const form = reactive<{ email: string, role: Exclude<Role, 'owner'> }>({ email: '', role: 'member' })
const schema = z.object({ email: z.email('Enter a valid email address'), role: z.enum(['viewer', 'member', 'admin']) })

const ROLE_INFO: Record<Role, string> = {
  viewer: 'Can view everything',
  member: 'Can create and edit records',
  admin: 'Can also manage members and settings',
  owner: 'Full control, including deleting the workspace'
}
const orgId = () => ws.current.value!.id
const assignable = computed(() => (['viewer', 'member', 'admin', 'owner'] as Role[])
  .filter(r => r !== 'owner' || hasRole('owner'))
  .map(r => ({ label: humanize(r), value: r, description: ROLE_INFO[r] })))

async function load() {
  const [m, i] = await Promise.all([
    sb.from('memberships').select('user_id, role, created_at, profiles(id, full_name, email, avatar_url)').eq('org_id', orgId()).order('created_at'),
    hasRole('admin')
      ? sb.from('invitations').select('id, email, role, token, expires_at').eq('org_id', orgId()).is('accepted_at', null).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] })
  ])
  members.value = (m.data ?? []) as unknown as Member[]
  invites.value = (i.data ?? []) as Invite[]
  loading.value = false
}
onMounted(load)

const inviteLink = (token: string) => `${window.location.origin}/invite/${token}`

async function copy(token: string) {
  await navigator.clipboard.writeText(inviteLink(token))
  toast.add({ title: 'Invite link copied', description: 'Send it to the person you invited.', color: 'success', icon: 'i-lucide-copy-check' })
}

async function invite() {
  inviting.value = true
  const { data, error } = await sb.from('invitations')
    .insert({ org_id: orgId(), email: form.email.trim().toLowerCase(), role: form.role })
    .select('id, email, role, token, expires_at').single()
  inviting.value = false
  if (error) return toast.add({ title: 'Could not invite', description: friendlyError(error), color: 'error' })
  invites.value.unshift(data as Invite)
  form.email = ''
  await copy((data as Invite).token)
}

async function revoke(inv: Invite) {
  const { error } = await sb.from('invitations').delete().eq('id', inv.id)
  if (error) return toast.add({ title: 'Could not revoke', description: friendlyError(error), color: 'error' })
  invites.value = invites.value.filter(i => i.id !== inv.id)
}

const canManage = (m: Member) => m.user_id !== user.value?.id && hasRole('admin') && (m.role !== 'owner' || hasRole('owner'))

async function changeRole(m: Member, role: Role) {
  const { data, error } = await sb.from('memberships').update({ role }).eq('org_id', orgId()).eq('user_id', m.user_id).select('role')
  if (error || !data?.length) return toast.add({ title: 'Could not change role', description: friendlyError(error ?? { code: '42501' }), color: 'error' })
  m.role = role
}

async function remove(m: Member) {
  const self = m.user_id === user.value?.id
  const ok = await confirm({
    title: self ? `Leave ${ws.current.value?.name}?` : `Remove ${personName(m.profiles)}?`,
    description: self ? 'You will lose access to this workspace.' : 'They will lose access immediately.',
    confirmLabel: self ? 'Leave' : 'Remove',
    danger: true
  })
  if (!ok) return
  const { error } = await sb.from('memberships').delete().eq('org_id', orgId()).eq('user_id', m.user_id)
  if (error) return toast.add({ title: 'Could not remove', description: friendlyError(error), color: 'error' })
  if (self) {
    await ws.load()
    return navigateTo(ws.current.value ? '/app' : '/app/onboarding')
  }
  members.value = members.value.filter(x => x.user_id !== m.user_id)
}
</script>

<template>
  <UDashboardPanel id="settings-members">
    <template #header>
      <UDashboardNavbar title="Settings" icon="i-lucide-settings">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
      <SettingsNav />
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-3xl space-y-6">
        <UCard v-if="hasRole('admin')">
          <template #header>
            <h2 class="font-semibold text-highlighted">Invite people</h2>
            <p class="text-sm text-muted">You get a link to share. It works once, for that email address, for 14 days.</p>
          </template>
          <UForm :schema="schema" :state="form" class="flex flex-col gap-3 sm:flex-row sm:items-start" @submit="invite">
            <UFormField name="email" class="flex-1">
              <UInput v-model="form.email" type="email" placeholder="name@company.com" class="w-full" />
            </UFormField>
            <UFormField name="role">
              <USelect v-model="form.role" :items="assignable.filter(r => r.value !== 'owner')" class="w-full sm:w-36" />
            </UFormField>
            <UButton type="submit" label="Create invite" icon="i-lucide-send" :loading="inviting" />
          </UForm>

          <ul v-if="invites.length" class="mt-4 divide-y divide-default rounded-md border border-default">
            <li v-for="inv in invites" :key="inv.id" class="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <UIcon name="i-lucide-mail" class="size-4 text-muted" />
              <span class="min-w-0 flex-1 truncate">{{ inv.email }}</span>
              <UBadge :label="inv.role" color="neutral" variant="subtle" />
              <span class="text-xs text-muted">expires {{ formatDate(inv.expires_at) }}</span>
              <UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" aria-label="Copy invite link" @click="copy(inv.token)" />
              <UButton icon="i-lucide-x" size="xs" color="neutral" variant="ghost" aria-label="Revoke invite" @click="revoke(inv)" />
            </li>
          </ul>
        </UCard>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <template #header>
            <h2 class="font-semibold text-highlighted">Members <span class="text-muted font-normal">({{ members.length }})</span></h2>
          </template>
          <div v-if="loading" class="p-4"><USkeleton class="h-10 w-full" /></div>
          <ul v-else class="divide-y divide-default">
            <li v-for="m in members" :key="m.user_id" class="flex flex-wrap items-center gap-3 px-4 py-3">
              <UUser
                :name="personName(m.profiles) + (m.user_id === user?.id ? ' (you)' : '')"
                :description="m.profiles?.email ?? undefined"
                :avatar="{ src: m.profiles?.avatar_url ?? undefined, alt: personName(m.profiles) }"
                class="min-w-0 flex-1"
              />
              <USelect
                v-if="canManage(m)"
                :model-value="m.role"
                :items="assignable"
                class="w-32"
                @update:model-value="(r: Role) => changeRole(m, r)"
              />
              <UBadge v-else :label="humanize(m.role)" :color="roleAtLeast(m.role, 'admin') ? 'primary' : 'neutral'" variant="subtle" />
              <UButton
                v-if="canManage(m) || m.user_id === user?.id"
                :icon="m.user_id === user?.id ? 'i-lucide-log-out' : 'i-lucide-user-minus'"
                :aria-label="m.user_id === user?.id ? 'Leave workspace' : 'Remove member'"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="remove(m)"
              />
            </li>
          </ul>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
