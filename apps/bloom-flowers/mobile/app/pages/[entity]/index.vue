<script setup lang="ts">
import type { RefresherCustomEvent } from '@ionic/vue'
import { isPublicEntity, isSubmittable, type Row } from '#core/utils/meta'

const entity = useEntityRoute()
const router = useIonRouter()
const { user } = useAuth()
const catalog = isPublicEntity(entity)
const search = ref('')
const list = ref<{ reload: () => Promise<void> | void }>()

if (entity.access === 'inbox') onMounted(() => router.replace(`/${entity.slug}/new`))

async function refresh(ev: RefresherCustomEvent) {
  await list.value?.reload()
  await ev.target.complete()
}
onIonViewWillEnter(() => list.value?.reload())
const open = (row: Row) => `/${entity.slug}/${row.id}`
useHead({ title: entity.plural })
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>{{ catalog ? entity.plural : `Your ${entity.plural.toLowerCase()}` }}</ion-title>
        <ion-buttons slot="end"><CartButton /></ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="catalog">
        <ion-searchbar v-model="search" :debounce="300" :placeholder="`Search ${entity.plural.toLowerCase()}`" />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <CatalogGrid v-if="catalog" ref="list" :entity="entity" :search="search" :page-size="24" infinite />
      <template v-else-if="entity.access === 'customer'">
        <div v-if="!user" class="empty-state">
          <Icon :name="entity.icon" />
          <p>Sign in to see your {{ entity.plural.toLowerCase() }}.</p>
          <ion-button :router-link="`/login?redirect=/${entity.slug}`">Sign in</ion-button>
        </div>
        <RecordList v-else ref="list" :entity="entity" scope="mine" :link-to="open" />
      </template>
      <div v-else class="empty-state">
        <Icon name="i-lucide-search-x" />
        <p>This page does not exist.</p>
      </div>

      <ion-fab v-if="isSubmittable(entity) && entity.access === 'customer'" slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button :router-link="`/${entity.slug}/new`" :aria-label="`New ${entity.label.toLowerCase()}`">
          <Icon name="i-lucide-plus" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>
