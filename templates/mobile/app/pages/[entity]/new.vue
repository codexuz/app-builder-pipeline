<script setup lang="ts">
const entity = useEntityRoute()
const route = useRouter().currentRoute.value
const router = useIonRouter()
useHead({ title: `New ${entity.label.toLowerCase()}` })

// Related lists link here with ?<field>=<id> to pre-fill the parent.
const preset = Object.fromEntries(entity.fields
  .filter(f => typeof route.query[f.name] === 'string')
  .map(f => [f.name, route.query[f.name]]))
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/${entity.slug}`" />
        </ion-buttons>
        <ion-title>New {{ entity.label.toLowerCase() }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <RecordForm :entity="entity" :preset="preset" @saved="row => router.replace(`/${entity.slug}/${row.id}`)" />
    </ion-content>
  </ion-page>
</template>
