<script setup lang="ts">
import { app } from '#core/schema'
import { entityByName, personName, recordTitle, type Row } from '#core/utils/meta'

const entity = useEntityRoute()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const { can, isAdmin } = usePermissions()
const records = useRecords(entity)

const id = String(route.params.id)
const record = ref<Row | null>(null)
const loading = ref(true)

async function load() {
  try {
    record.value = await records.get(id)
  } catch (err) {
    toast.add({ title: 'Could not load record', description: friendlyError(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)

const title = computed(() => record.value ? recordTitle(entity, record.value) : entity.label)
useHead({ title })

const children = computed(() => entity.children
  .map(c => ({ ...c, meta: entityByName(c.entity)! }))
  .filter(c => c.meta))
const details = computed(() => entity.fields.filter(f => f.name !== entity.title || f.alias))
const inWorkspace = computed(() => record.value?.org_id === useWorkspace().current.value?.id)

async function remove() {
  if (!record.value) return
  const ok = await confirm({ title: `Delete ${title.value}?`, description: 'This cannot be undone.', confirmLabel: 'Delete', danger: true })
  if (!ok) return
  try {
    await records.remove(id)
    toast.add({ title: `${entity.label} deleted`, color: 'success' })
    router.replace(`/app/${entity.slug}`)
  } catch (err) {
    toast.add({ title: 'Could not delete', description: friendlyError(err, entity), color: 'error' })
  }
}
</script>

<template>
  <UDashboardPanel :id="`detail-${entity.name}`">
    <template #header>
      <UDashboardNavbar :title="title" :icon="entity.icon">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template v-if="record" #right>
          <UButton v-if="can(entity, 'update', record)" :to="`/app/${entity.slug}/${id}/edit`" icon="i-lucide-pencil" label="Edit" color="neutral" variant="outline" />
          <UButton v-if="can(entity, 'delete', record)" icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Delete" @click="remove" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div v-if="loading" class="space-y-3">
        <USkeleton class="h-8 w-1/3" />
        <USkeleton class="h-40 w-full" />
      </div>

      <UAlert
        v-else-if="!record"
        icon="i-lucide-search-x"
        color="neutral"
        variant="subtle"
        title="Record not found"
        description="It may have been deleted, or you do not have access to it."
        :actions="[{ label: `Back to ${entity.plural.toLowerCase()}`, to: `/app/${entity.slug}` }]"
      />

      <div v-else class="grid gap-6 xl:grid-cols-3">
        <div class="space-y-6 xl:col-span-2">
          <UCard>
            <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div v-for="f in details" :key="f.name" :class="['longtext', 'json', 'tags'].includes(f.type) ? 'sm:col-span-2' : ''">
                <dt class="text-xs font-medium uppercase tracking-wide text-muted">{{ f.label }}</dt>
                <dd class="mt-1 text-sm text-default"><EntityValue :field="f" :row="record" /></dd>
              </div>
            </dl>
            <template #footer>
              <p class="text-xs text-muted">
                Created {{ timeAgo(record.created_at) }} by {{ personName(record.creator) }}
                <template v-if="record.updated_at !== record.created_at"> · updated {{ timeAgo(record.updated_at) }}</template>
              </p>
            </template>
          </UCard>

          <section v-for="c in children" :key="`${c.entity}.${c.field}`" class="space-y-3">
            <div class="flex items-center justify-between gap-2">
              <h2 class="flex items-center gap-2 font-semibold text-highlighted">
                <UIcon :name="c.meta.icon" class="size-4 text-muted" />
                {{ c.meta.plural }}
              </h2>
              <UButton
                v-if="can(c.meta, 'create') && (inWorkspace || entity.access === 'members')"
                :to="{ path: `/app/${c.meta.slug}/new`, query: { [c.field]: id } }"
                icon="i-lucide-plus"
                :label="`Add ${c.meta.label.toLowerCase()}`"
                size="sm"
                color="neutral"
                variant="outline"
              />
            </div>
            <EntityTable :entity="c.meta" :where="{ [c.field]: id }" :page-size="10" compact />
          </section>
        </div>

        <div class="space-y-6">
          <EntityAttachments v-if="entity.attachments" :entity="entity" :record="record" :editable="can(entity, 'update', record)" />
          <EntityActivity v-if="isAdmin && inWorkspace && app.type !== 'personal'" :entity="entity" :record="record" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
