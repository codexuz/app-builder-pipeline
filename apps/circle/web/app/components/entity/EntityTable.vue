<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import { recordTitle, type EntityMeta, type Row } from '#core/utils/meta'

const props = withDefaults(defineProps<{
  entity: EntityMeta
  // Fixed filters, e.g. { company_id: '…' } for a related list on a detail page.
  where?: Record<string, unknown>
  pageSize?: number
  compact?: boolean
}>(), { pageSize: 25 })

const UButton = resolveComponent('UButton')
const records = useRecords(props.entity)
const toast = useToast()
const confirm = useConfirm()
const { can } = usePermissions()

const rows = ref<Row[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const search = ref('')
const filters = reactive<Record<string, string>>({})
// Staff manage their own workspace's rows; only community data (access members) spans workspaces.
const scope = ref<'workspace' | 'all'>(props.entity.access === 'members' ? 'all' : 'workspace')
const sorting = ref([{ id: props.entity.sort.field, desc: props.entity.sort.dir === 'desc' }])

// Select items need a non-empty value, so "no filter" is a sentinel.
const ALL = '__all__'
const hidden = computed(() => new Set(Object.keys(props.where ?? {})))
const listFields = computed(() => props.entity.fields.filter(f => f.list && !hidden.value.has(f.name)).slice(0, props.compact ? 4 : 7))
const filterFields = computed(() => props.compact ? [] : props.entity.fields.filter(f => f.type === 'enum' && !hidden.value.has(f.name)).slice(0, 2))
const canSearch = props.entity.fields.some(f => f.search)

function sortHeader(label: string) {
  return ({ column }: any) => {
    const dir = column.getIsSorted()
    return h(UButton, {
      label,
      color: 'neutral',
      variant: 'ghost',
      size: 'sm',
      class: '-mx-2.5',
      trailingIcon: dir === 'asc' ? 'i-lucide-arrow-up-narrow-wide' : dir === 'desc' ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-down',
      onClick: () => column.toggleSorting(dir === 'asc')
    })
  }
}

const columns = computed<TableColumn<Row>[]>(() => [
  ...listFields.value.map(f => ({
    accessorKey: f.name,
    header: ['json', 'tags', 'relation', 'user'].includes(f.type) ? f.label : sortHeader(f.label),
    enableSorting: !['json', 'tags', 'relation', 'user'].includes(f.type)
  })),
  ...(props.compact ? [] : [{ accessorKey: 'updated_at', header: sortHeader('Updated') }]),
  { id: 'actions', header: '' }
])

let seq = 0
async function load() {
  const mine = ++seq
  loading.value = true
  try {
    const sort = sorting.value[0]
    const res = await records.list({
      page: page.value,
      pageSize: props.pageSize,
      search: search.value,
      filters: { ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ALL)), ...props.where },
      sort: sort ? { field: sort.id, desc: sort.desc } : undefined,
      scope: scope.value
    })
    if (mine !== seq) return
    rows.value = res.rows
    total.value = res.total
  } catch (err) {
    toast.add({ title: `Could not load ${props.entity.plural.toLowerCase()}`, description: friendlyError(err), color: 'error' })
  } finally {
    if (mine === seq) loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
})
watch([filters, scope, sorting], () => { page.value = 1; load() }, { deep: true })
watch(page, load)

async function remove(row: Row) {
  const ok = await confirm({
    title: `Delete ${recordTitle(props.entity, row)}?`,
    description: 'This cannot be undone.',
    confirmLabel: 'Delete',
    danger: true
  })
  if (!ok) return
  try {
    await records.remove(row.id)
    toast.add({ title: `${props.entity.label} deleted`, color: 'success' })
    load()
  } catch (err) {
    toast.add({ title: 'Could not delete', description: friendlyError(err, props.entity), color: 'error' })
  }
}

const actionItems = (row: Row) => [
  [{ label: 'Open', icon: 'i-lucide-eye', to: `/app/${props.entity.slug}/${row.id}` }],
  ...(can(props.entity, 'update', row) ? [[{ label: 'Edit', icon: 'i-lucide-pencil', to: `/app/${props.entity.slug}/${row.id}/edit` }]] : []),
  ...(can(props.entity, 'delete', row) ? [[{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => remove(row) }]] : [])
]

let refreshTimer: ReturnType<typeof setTimeout> | undefined
let unsubscribe = () => {}
onMounted(() => {
  load()
  unsubscribe = records.subscribe(() => {
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(load, 400)
  }, scope.value)
})
onBeforeUnmount(() => unsubscribe())

defineExpose({ reload: load })
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-if="!compact" class="flex flex-wrap items-center gap-2">
      <UInput
        v-if="canSearch"
        v-model="search"
        icon="i-lucide-search"
        :placeholder="`Search ${entity.plural.toLowerCase()}…`"
        class="w-full sm:w-64"
      />
      <USelect
        v-for="f in filterFields"
        :key="f.name"
        :model-value="filters[f.name] ?? ALL"
        :items="[{ label: `Any ${f.label.toLowerCase()}`, value: ALL }, ...optionItems(f)]"
        @update:model-value="(v: string) => (filters[f.name] = v)"
        :placeholder="f.label"
        class="w-40"
      />
      <UTabs
        v-if="entity.access === 'members' && !where"
        v-model="scope"
        :items="[{ label: 'Everyone', value: 'all' }, { label: 'Mine', value: 'workspace' }]"
        :content="false"
        size="sm"
        class="ms-auto w-48"
      />
    </div>

    <UTable
      v-model:sorting="sorting"
      :data="rows"
      :columns="columns"
      :loading="loading"
      :sorting-options="{ manualSorting: true }"
      sticky
      class="rounded-lg border border-default"
    >
      <template v-for="(f, i) in listFields" :key="f.name" #[`${f.name}-cell`]="{ row }">
        <ULink v-if="i === 0" :to="`/app/${entity.slug}/${row.original.id}`" class="font-medium text-highlighted hover:text-primary">
          {{ f.name === entity.title ? recordTitle(entity, row.original) : formatValue(f, row.original[f.name]) }}
        </ULink>
        <EntityValue v-else :field="f" :row="row.original" />
      </template>
      <template #updated_at-cell="{ row }">
        <span class="text-muted">{{ timeAgo(row.original.updated_at) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UDropdownMenu :items="actionItems(row.original)" :content="{ align: 'end' }">
            <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="sm" aria-label="Actions" />
          </UDropdownMenu>
        </div>
      </template>
      <template #empty>
        <div class="flex flex-col items-center gap-2 py-10 text-center">
          <UIcon :name="entity.icon" class="size-8 text-dimmed" />
          <p class="text-sm text-muted">
            {{ search || Object.values(filters).some(v => v !== ALL) ? 'No matches. Try a different search or filter.' : `No ${entity.plural.toLowerCase()} yet.` }}
          </p>
        </div>
      </template>
    </UTable>

    <div v-if="total > pageSize" class="flex items-center justify-between gap-2 text-sm text-muted">
      <span>{{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, total) }} of {{ total }}</span>
      <UPagination v-model:page="page" :total="total" :items-per-page="pageSize" size="sm" />
    </div>
  </div>
</template>
