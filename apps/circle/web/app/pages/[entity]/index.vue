<script setup lang="ts">
import { isPublicEntity, isSubmittable, recordTitle, type Row } from '#core/utils/meta'

definePageMeta({ layout: 'site' })

const entity = useEntityRoute()
// Staff-only data has no public page; it lives in /app.
if (!isPublicEntity(entity) && entity.access !== 'customer' && entity.access !== 'inbox') {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}
if (entity.access === 'inbox') await navigateTo(`/${entity.slug}/new`, { replace: true })

const catalog = isPublicEntity(entity)
const records = useRecords(entity)
const { user } = useAuth()
const PAGE_SIZE = 24

const page = ref(1)
const search = ref('')
const term = ref('')
const option = ref('all')
const filterField = entity.fields.find(f => f.type === 'enum' && f.list && !f.staff)
const canSearch = entity.fields.some(f => f.search)

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => { term.value = v; page.value = 1 }, 300)
})
watch(option, () => { page.value = 1 })

// Catalogs render on the server; "my bookings" needs the session, so it loads in the browser.
const { data, status } = await useAsyncData(
  `list:${entity.name}`,
  () => records.list({
    page: page.value,
    pageSize: PAGE_SIZE,
    search: term.value,
    filters: filterField && option.value !== 'all' ? { [filterField.name]: option.value } : undefined,
    scope: catalog ? 'all' : 'mine'
  }),
  { watch: [page, term, option], server: catalog, immediate: catalog || Boolean(user.value) }
)
const rows = computed<Row[]>(() => data.value?.rows ?? [])
const total = computed(() => data.value?.total ?? 0)
const summary = (row: Row) => entity.fields.filter(f => f.list && f.name !== entity.title && !f.auto).slice(0, 4)

useSeoMeta({
  title: entity.plural,
  description: entity.description,
  ogTitle: entity.plural
})
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">{{ catalog ? entity.plural : `Your ${entity.plural.toLowerCase()}` }}</h1>
        <p v-if="entity.description" class="mt-1 text-sm text-muted">{{ entity.description }}</p>
      </div>
      <UButton v-if="isSubmittable(entity)" :to="`/${entity.slug}/new`" icon="i-lucide-plus" :label="`New ${entity.label.toLowerCase()}`" />
    </div>

    <template v-if="catalog">
      <div class="mb-6 flex flex-wrap gap-2">
        <UInput v-if="canSearch" v-model="search" icon="i-lucide-search" :placeholder="`Search ${entity.plural.toLowerCase()}…`" class="w-full sm:w-72" />
        <USelect
          v-if="filterField"
          v-model="option"
          :items="[{ label: `Any ${filterField.label.toLowerCase()}`, value: 'all' }, ...optionItems(filterField)]"
          class="w-44"
        />
      </div>
      <p v-if="!rows.length && status !== 'pending'" class="py-16 text-center text-muted">
        {{ term || option !== 'all' ? 'Nothing matches your search.' : `No ${entity.plural.toLowerCase()} yet.` }}
      </p>
      <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <SiteRecordCard v-for="row in rows" :key="row.id" :entity="entity" :row="row" />
      </div>
    </template>

    <ClientOnly v-else>
      <UAlert
        v-if="!user"
        color="neutral"
        variant="subtle"
        icon="i-lucide-user"
        :title="`Sign in to see your ${entity.plural.toLowerCase()}`"
        :actions="[{ label: 'Sign in', to: { path: '/login', query: { redirect: `/${entity.slug}` } } }]"
      />
      <p v-else-if="!rows.length && status !== 'pending'" class="py-16 text-center text-muted">No {{ entity.plural.toLowerCase() }} yet.</p>
      <ul v-else class="divide-y divide-default rounded-lg border border-default">
        <li v-for="row in rows" :key="row.id">
          <NuxtLink :to="`/${entity.slug}/${row.id}`" class="flex flex-wrap items-center gap-x-6 gap-y-1 p-4 hover:bg-elevated/50">
            <span class="font-medium text-highlighted">{{ recordTitle(entity, row) }}</span>
            <span v-for="f in summary(row)" :key="f.name" class="text-sm text-muted"><EntityValue :field="f" :row="row" site /></span>
          </NuxtLink>
        </li>
      </ul>
    </ClientOnly>

    <div v-if="total > PAGE_SIZE" class="mt-8 flex justify-center">
      <UPagination v-model:page="page" :total="total" :items-per-page="PAGE_SIZE" />
    </div>
  </UContainer>
</template>
