<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { teams, isAdmin } = usePermissions()
const items = computed<NavigationMenuItem[]>(() => [
  ...(teams && isAdmin.value ? [{ label: 'Workspace', icon: 'i-lucide-building', to: '/app/settings', exact: true }] : []),
  ...(teams ? [{ label: 'Members', icon: 'i-lucide-users', to: '/app/settings/members' }] : []),
  { label: 'Profile', icon: 'i-lucide-user', to: '/app/settings/profile' }
])
</script>

<template>
  <UDashboardToolbar>
    <UNavigationMenu :items="items" highlight class="-mx-1 flex-1" />
  </UDashboardToolbar>
</template>
