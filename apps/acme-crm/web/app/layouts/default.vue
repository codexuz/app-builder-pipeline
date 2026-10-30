<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { app } from '#core/schema'

const { user, signOut } = useAuth()
const ws = useWorkspace()
const { teams, isAdmin } = usePermissions()
const colorMode = useColorMode()
const open = ref(false)

const nav = computed<NavigationMenuItem[][]>(() => [
  [
    { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/', exact: true },
    ...navEntities().map(e => ({ label: e.plural, icon: e.icon, to: `/${e.slug}` }))
  ],
  [
    ...(teams ? [{ label: 'Members', icon: 'i-lucide-users', to: '/settings/members' }] : []),
    { label: 'Settings', icon: 'i-lucide-settings', to: teams && isAdmin.value ? '/settings' : '/settings/profile' }
  ]
].map(group => group.map(item => ({ ...item, onSelect: () => { open.value = false } }))))

const workspaceItems = computed<DropdownMenuItem[][]>(() => [
  ws.list.value.map(w => ({
    label: w.name,
    icon: w.id === ws.current.value?.id ? 'i-lucide-check' : 'i-lucide-building',
    onSelect: () => switchTo(w.id)
  })),
  [{ label: 'New workspace', icon: 'i-lucide-plus', to: '/onboarding?new=1' }]
])

async function switchTo(id: string) {
  ws.select(id)
  await navigateTo('/')
}

const displayName = computed(() => user.value?.user_metadata?.full_name || user.value?.email || '')

const userItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: user.value?.email ?? '', type: 'label' }],
  [
    { label: 'Profile', icon: 'i-lucide-user', to: '/settings/profile' },
    {
      label: colorMode.value === 'dark' ? 'Light mode' : 'Dark mode',
      icon: colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
      onSelect: () => { colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark' }
    }
  ],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: () => signOut() }]
])

const searchGroups = computed(() => [{
  id: 'pages',
  label: 'Go to',
  items: nav.value.flat().map(i => ({ label: i.label as string, icon: i.icon as string, to: i.to as string }))
}])
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar v-model:open="open" collapsible resizable :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <UDropdownMenu v-if="teams && !collapsed" :items="workspaceItems" :content="{ align: 'start' }" class="w-full">
          <UButton
            :label="ws.current.value?.name ?? app.name"
            icon="i-lucide-layers"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral"
            variant="ghost"
            block
            class="justify-start font-semibold"
            :ui="{ trailingIcon: 'ms-auto text-dimmed' }"
          />
        </UDropdownMenu>
        <div v-else class="flex items-center gap-2 px-1 font-semibold text-highlighted">
          <UIcon name="i-lucide-layers" class="size-5 shrink-0 text-primary" />
          <span v-if="!collapsed" class="truncate">{{ app.name }}</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />
        <UNavigationMenu :collapsed="collapsed" :items="nav[0]" orientation="vertical" tooltip />
        <UNavigationMenu :collapsed="collapsed" :items="nav[1]" orientation="vertical" tooltip class="mt-auto" />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu :items="userItems" :content="{ align: 'start', side: 'top' }" class="w-full">
          <UButton
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="justify-start"
            :avatar="{ alt: displayName, size: 'xs' }"
            :label="collapsed ? undefined : displayName"
            :ui="{ label: 'truncate' }"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <slot />
  </UDashboardGroup>
</template>
