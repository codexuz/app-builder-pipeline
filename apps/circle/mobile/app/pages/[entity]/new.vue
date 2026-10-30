<script setup lang="ts">
import type { Row } from '#core/utils/meta'

const entity = useEntityRoute()
const route = useRouter().currentRoute.value
const router = useIonRouter()
const heading = entity.access === 'inbox' ? 'Contact us' : `New ${entity.label.toLowerCase()}`
useHead({ title: heading })

// Links such as "Write a review" pass ?<field>=<id> to fill in what the record is about.
const preset = Object.fromEntries(entity.fields
  .filter(f => typeof route.query[f.name] === 'string')
  .map(f => [f.name, route.query[f.name]]))
const loginPath = `/login?redirect=${encodeURIComponent(route.fullPath)}`

function saved(row: Row | null) {
  if (row) router.replace(`/${entity.slug}/${row.id}`)
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" /></ion-buttons>
        <ion-title>{{ heading }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <PublicForm :entity="entity" :preset="preset" :login-path="loginPath" @saved="saved" />
    </ion-content>
  </ion-page>
</template>
