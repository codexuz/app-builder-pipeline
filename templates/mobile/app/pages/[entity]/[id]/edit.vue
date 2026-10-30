<script setup lang="ts">
import { recordTitle, type Row } from '#core/utils/meta'

const entity = useEntityRoute()
const id = String(useRouter().currentRoute.value.params.id)
const router = useIonRouter()
const notify = useNotify()
const { can } = usePermissions()
const record = ref<Row | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    record.value = await useRecords(entity).get(id)
  } catch (err) {
    await notify.error('Could not load record', err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/${entity.slug}/${id}`" />
        </ion-buttons>
        <ion-title>{{ record ? `Edit ${recordTitle(entity, record)}` : 'Edit' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-progress-bar v-if="loading" type="indeterminate" />
      <div v-else-if="!record || !can(entity, 'update', record)" class="empty-state">
        <Icon name="i-lucide-lock" />
        <p>{{ record ? 'You cannot edit this record.' : 'Record not found.' }}</p>
      </div>
      <RecordForm v-else :entity="entity" :record="record" @saved="router.back()" />
    </ion-content>
  </ion-page>
</template>
