<script setup lang="ts">
import { menuController } from '@ionic/vue'
import { app, commerce, entities } from '#core/schema'
import { isPublicEntity, navEntities } from '#core/utils/meta'

defineProps<{ disabled: boolean }>()

const route = useRouter().currentRoute
const { user, signOut } = useAuth()
const ws = useWorkspace()
const { teams, isAdmin } = usePermissions()
const inApp = computed(() => inWorkspaceArea(route.value.path))

// Staff see their workspace once signed in; the public menu offers a way in.
watch(user, (u) => { if (u && !ws.loaded.value) ws.load().catch(() => {}) }, { immediate: true })

const publicItems = computed(() => [
  { label: 'Home', icon: 'i-lucide-house', to: '/' },
  ...entities
    .filter(e => e.nav && !e.createdByFunction && (isPublicEntity(e) || e.access === 'customer' || e.access === 'inbox'))
    .map(e => e.access === 'inbox'
      ? { label: 'Contact', icon: e.icon, to: `/${e.slug}/new` }
      : { label: e.plural, icon: e.icon, to: `/${e.slug}` }),
  ...(commerce ? [{ label: 'Cart', icon: 'i-lucide-shopping-cart', to: '/cart' }] : []),
  ...(user.value ? [{ label: 'Your account', icon: 'i-lucide-user', to: '/account' }] : [{ label: 'Sign in', icon: 'i-lucide-log-in', to: '/login' }]),
  ...(ws.current.value ? [{ label: 'Staff area', icon: 'i-lucide-layout-dashboard', to: '/app' }] : [])
])
const staffItems = computed(() => [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/app' },
  ...navEntities().map(e => ({ label: e.plural, icon: e.icon, to: `/app/${e.slug}` }))
])
const items = computed(() => inApp.value ? staffItems.value : publicItems.value)
const settings = computed(() => inApp.value
  ? [
      ...(teams && isAdmin.value ? [{ label: 'Workspace', icon: 'i-lucide-building', to: '/app/settings' }] : []),
      ...(teams ? [{ label: 'Members', icon: 'i-lucide-users', to: '/app/settings/members' }] : []),
      { label: 'Profile', icon: 'i-lucide-user', to: '/app/settings/profile' },
      ...(app.publicSite ? [{ label: 'Public site', icon: 'i-lucide-store', to: '/' }] : [])
    ]
  : [])
const active = (to: string) => ['/', '/app'].includes(to) ? route.value.path === to : route.value.path === to || route.value.path.startsWith(`${to}/`)
const name = computed(() => user.value?.user_metadata?.full_name || user.value?.email || '')
</script>

<template>
  <ion-menu content-id="main" type="overlay" :disabled="disabled">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ inApp && teams ? ws.current.value?.name ?? app.name : app.name }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list lines="none">
        <ion-menu-toggle v-for="item in items" :key="item.to" :auto-hide="false">
          <ion-item :router-link="item.to" router-direction="root" :detail="false" :class="{ 'menu-active': active(item.to) }" button>
            <Icon :name="item.icon" slot="start" class="menu-icon" />
            <ion-label>{{ item.label }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>

      <ion-list v-if="settings.length" lines="none">
        <ion-list-header>Settings</ion-list-header>
        <ion-menu-toggle v-for="item in settings" :key="item.to" :auto-hide="false">
          <ion-item :router-link="item.to" router-direction="root" :detail="false" :class="{ 'menu-active': active(item.to) }" button>
            <Icon :name="item.icon" slot="start" class="menu-icon" />
            <ion-label>{{ item.label }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
    <ion-footer v-if="user">
      <ion-item lines="none">
        <ion-label>
          <h3>{{ name }}</h3>
          <p>{{ user.email }}</p>
        </ion-label>
        <ion-button slot="end" fill="clear" color="medium" aria-label="Sign out" @click="menuController.close(); signOut()">
          <Icon name="i-lucide-log-out" />
        </ion-button>
      </ion-item>
    </ion-footer>
  </ion-menu>
</template>
