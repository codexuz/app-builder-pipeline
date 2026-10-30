<script setup lang="ts">
import { recordTitle, type Row } from '#core/utils/meta'

const entity = useEntityRoute()
const route = useRoute()
const router = useRouter()
const { can } = usePermissions()
const toast = useToast()

const record = ref<Row | null>(null)
const loading = ref(true)
const id = String(route.params.id)

onMounted(async () => {
  try {
    record.value = await useRecords(entity).get(id)
  } catch (err) {
    toast.add({ title: 'Could not load record', description: friendlyError(err), color: 'error' })
  } finally {
    loading.value = false
  }
})
useHead({ title: () => record.value ? `Edit ${recordTitle(entity, record.value)}` : `Edit ${entity.label.toLowerCase()}` })
</script>

<template>
  <UDashboardPanel :id="`edit-${entity.name}`">
    <template #header>
      <UDashboardNavbar :title="record ? `Edit ${recordTitle(entity, record)}` : 'Edit'" :icon="entity.icon">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-3xl">
        <div v-if="loading" class="space-y-4">
          <USkeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>
        <UAlert
          v-else-if="!record || !can(entity, 'update', record)"
          icon="i-lucide-lock"
          color="warning"
          variant="subtle"
          :title="record ? 'You cannot edit this record' : 'Record not found'"
          :description="record ? 'Ask a workspace admin for access.' : 'It may have been deleted, or you do not have access.'"
        />
        <EntityForm
          v-else
          :entity="entity"
          :record="record"
          @saved="row => router.replace(`/app/${entity.slug}/${row.id}`)"
          @cancel="router.back()"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
