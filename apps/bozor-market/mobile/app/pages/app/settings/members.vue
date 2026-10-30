<script setup lang="ts">
import { actionSheetController } from '@ionic/vue'
import * as z from 'zod'
import { personName, type Profile, type Role } from '#core/utils/meta'

const ws = useWorkspace()
const { user } = useAuth()
const { hasRole } = usePermissions()
const notify = useNotify()
const sb = useSupabase()

interface Member { user_id: string, role: Role, profiles: Profile }
const members = ref<Member[]>([])
const email = ref('')
const role = ref<Exclude<Role, 'owner'>>('member')
const inviting = ref(false)
const orgId = () => ws.current.value!.id

async function load() {
  const { data, error } = await sb.from('memberships').select('user_id, role, profiles(id, full_name, email, avatar_url)').eq('org_id', orgId()).order('created_at')
  if (error) return notify.error('Could not load members', error)
  members.value = (data ?? []) as unknown as Member[]
}
onMounted(load)

// Invites are links: shared through the phone's share sheet, valid once, for that email, for 14 days.
async function invite() {
  if (!z.email().safeParse(email.value.trim()).success) return notify.toast('Enter a valid email address', 'danger')
  inviting.value = true
  const { data, error } = await sb.from('invitations').insert({ org_id: orgId(), email: email.value.trim().toLowerCase(), role: role.value }).select('token').single()
  inviting.value = false
  if (error) return notify.error('Could not invite', error)
  email.value = ''
  await notify.share(`Join ${ws.current.value?.name}`, `${inviteOrigin()}/invite/${data.token}`)
}

// Native builds run on capacitor://localhost; invite links must open the deployed web app instead.
const inviteOrigin = () => (useRuntimeConfig().public.webUrl as string) || window.location.origin

const canManage = (m: Member) => m.user_id !== user.value?.id && hasRole('admin') && (m.role !== 'owner' || hasRole('owner'))

async function manage(m: Member) {
  const roles: Role[] = (['viewer', 'member', 'admin', 'owner'] as Role[]).filter(r => r !== m.role && (r !== 'owner' || hasRole('owner')))
  const sheet = await actionSheetController.create({
    header: personName(m.profiles),
    buttons: [
      ...roles.map(r => ({ text: `Make ${r}`, handler: () => { changeRole(m, r) } })),
      { text: 'Remove from workspace', role: 'destructive', handler: () => { remove(m) } },
      { text: 'Cancel', role: 'cancel' }
    ]
  })
  await sheet.present()
}

async function changeRole(m: Member, r: Role) {
  const { data, error } = await sb.from('memberships').update({ role: r }).eq('org_id', orgId()).eq('user_id', m.user_id).select('role')
  if (error || !data?.length) return notify.error('Could not change role', error ?? { code: '42501' })
  m.role = r
}

async function remove(m: Member) {
  if (!(await notify.confirm(`Remove ${personName(m.profiles)}?`, 'They lose access immediately.', 'Remove', true))) return
  const { error } = await sb.from('memberships').delete().eq('org_id', orgId()).eq('user_id', m.user_id)
  if (error) return notify.error('Could not remove', error)
  members.value = members.value.filter(x => x.user_id !== m.user_id)
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>Members</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list v-if="hasRole('admin')">
        <ion-list-header><ion-label>Invite someone</ion-label></ion-list-header>
        <ion-item>
          <ion-input v-model="email" label="Email" label-placement="stacked" type="email" inputmode="email" placeholder="name@company.com" />
        </ion-item>
        <ion-item>
          <ion-select v-model="role" label="Role" interface="action-sheet">
            <ion-select-option value="viewer">Viewer: can view</ion-select-option>
            <ion-select-option value="member">Member: can edit records</ion-select-option>
            <ion-select-option value="admin">Admin: also manages members</ion-select-option>
          </ion-select>
        </ion-item>
        <div class="ion-padding-horizontal ion-padding-bottom">
          <ion-button expand="block" :disabled="inviting" @click="invite">Create and share invite link</ion-button>
        </div>
      </ion-list>

      <ion-list>
        <ion-list-header><ion-label>Members ({{ members.length }})</ion-label></ion-list-header>
        <ion-item v-for="m in members" :key="m.user_id" :button="canManage(m)" :detail="canManage(m)" @click="canManage(m) && manage(m)">
          <ion-label>
            <h3>{{ personName(m.profiles) }}{{ m.user_id === user?.id ? ' (you)' : '' }}</h3>
            <p>{{ m.profiles?.email }}</p>
          </ion-label>
          <ion-badge slot="end" :color="m.role === 'owner' || m.role === 'admin' ? 'primary' : 'medium'">{{ humanize(m.role) }}</ion-badge>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>
