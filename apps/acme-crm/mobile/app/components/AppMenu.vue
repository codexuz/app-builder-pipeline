<script setup lang="ts">
import { menuController } from '@ionic/vue'
import { app } from '#core/schema'
import { navEntities } from '#core/utils/meta'

defineProps<{ disabled: boolean }>()

const route = useRouter().currentRoute
const { user, signOut } = useAuth()
const ws = useWorkspace()
const { teams, isAdmin } = usePermissions()

const items = computed(() => [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' },
  ...navEntities().map(e => ({ label: e.plural, icon: e.icon, to: `/${e.slug}` }))
])
const settings = computed(() => [
  ...(teams && isAdmin.value ? [{ label: 'Workspace', icon: 'i-lucide-building', to: '/settings' }] : []),
  ...(teams ? [{ label: 'Members', icon: 'i-lucide-users', to: '/settings/members' }] : []),
  { label: 'Profile', icon: 'i-lucide-user', to: '/settings/profile' }
])
const active = (to: string) => to === '/' ? route.value.path === '/' : route.value.path === to || route.value.path.startsWith(`${to}/`)
const name = computed(() => user.value?.user_metadata?.full_name || user.value?.email || '')
</script>

<template>
  <ion-menu content-id="main" type="overlay" :disabled="disabled">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ teams ? ws.current.value?.name ?? app.name : app.name }}</ion-title>
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

      <ion-list lines="none">
        <ion-list-header>Settings</ion-list-header>
        <ion-menu-toggle v-for="item in settings" :key="item.to" :auto-hide="false">
          <ion-item :router-link="item.to" router-direction="root" :detail="false" :class="{ 'menu-active': active(item.to) }" button>
            <Icon :name="item.icon" slot="start" class="menu-icon" />
            <ion-label>{{ item.label }}</ion-label>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>
    </ion-content>
    <ion-footer>
      <ion-item lines="none">
        <ion-label>
          <h3>{{ name }}</h3>
          <p>{{ user?.email }}</p>
        </ion-label>
        <ion-button slot="end" fill="clear" color="medium" aria-label="Sign out" @click="menuController.close(); signOut()">
          <Icon name="i-lucide-log-out" />
        </ion-button>
      </ion-item>
    </ion-footer>
  </ion-menu>
</template>
