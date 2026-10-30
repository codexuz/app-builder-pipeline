<script setup lang="ts">
import type { RefresherCustomEvent } from '@ionic/vue'

const entity = useEntityRoute()
const { can } = usePermissions()
const search = ref('')
const scope = ref<'all' | 'workspace'>(entity.visibility === 'public' ? 'all' : 'workspace')
const list = ref<{ reload: () => Promise<void> | void }>()

async function refresh(ev: RefresherCustomEvent) {
  await list.value?.reload()
  await ev.target.complete()
}
onIonViewWillEnter(() => list.value?.reload())
useHead({ title: entity.plural })
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ entity.plural }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="search" :debounce="300" :placeholder="`Search ${entity.plural.toLowerCase()}`" />
      </ion-toolbar>
      <ion-toolbar v-if="entity.visibility === 'public'">
        <ion-segment v-model="scope">
          <ion-segment-button value="all"><ion-label>Everyone</ion-label></ion-segment-button>
          <ion-segment-button value="workspace"><ion-label>Mine</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>
      <RecordList ref="list" :entity="entity" :search="search" :scope="scope" />

      <ion-fab v-if="can(entity, 'create')" slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button :router-link="`/${entity.slug}/new`" :aria-label="`New ${entity.label.toLowerCase()}`">
          <Icon name="i-lucide-plus" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>
