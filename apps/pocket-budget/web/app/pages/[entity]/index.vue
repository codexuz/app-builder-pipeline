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
const route = useRoute()
const PAGE_SIZE = 24

const page = ref(1)
const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const term = ref(search.value)
const option = ref('all')
const filterField = entity.fields.find(f => f.type === 'enum' && f.list && !f.staff)
const canSearch = entity.fields.some(f => f.search)

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => { term.value = v; page.value = 1 }, 300)
})
watch(() => route.query.q, (q) => { search.value = typeof q === 'string' ? q : '' })
watch(option, () => { page.value = 1 })

// Catalogs render on the server; "your bookings" needs the session, so it loads in the browser.
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
const summary = entity.fields.filter(f => f.list && f.name !== entity.title && !f.auto).slice(0, 4)
const heading = computed(() => catalog ? tl(entity.plural) : t('account.your', { name: tl(entity.plural).toLowerCase() }))

useSeoMeta({ title: () => tl(entity.plural), description: entity.description, ogTitle: () => tl(entity.plural) })
</script>

<template>
  <div class="site-section site-wrap">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="site-title site-h1">{{ heading }}</h1>
        <p v-if="entity.description" class="site-lede mt-1">{{ tl(entity.description) }}</p>
      </div>
      <UButton v-if="isSubmittable(entity)" :to="`/${entity.slug}/new`" icon="i-lucide-plus" :label="t('form.new')" />
    </div>

    <template v-if="catalog">
      <div class="mb-6 space-y-3">
        <UInput v-if="canSearch" v-model="search" size="lg" icon="i-lucide-search" :placeholder="t('shop.searchIn', { name: tl(entity.plural) })" class="w-full sm:max-w-md" :aria-label="t('shop.search')" />
        <div v-if="filterField" class="chips" role="group" :aria-label="tl(filterField.label)">
          <button type="button" class="chip" :aria-pressed="option === 'all'" @click="option = 'all'">{{ t('shop.all') }}</button>
          <button v-for="o in optionItems(filterField)" :key="o.value" type="button" class="chip" :aria-pressed="option === o.value" @click="option = o.value">{{ o.label }}</button>
        </div>
      </div>
      <p v-if="!rows.length && status !== 'pending'" class="py-16 text-center text-muted">{{ t('shop.nothing') }}</p>
      <div v-else class="site-grid">
        <SiteRecordCard v-for="row in rows" :key="row.id" :entity="entity" :row="row" />
      </div>
    </template>

    <ClientOnly v-else>
      <UAlert
        v-if="!user"
        color="neutral"
        variant="subtle"
        icon="i-lucide-user"
        :title="t('form.signInFirst')"
        :actions="[{ label: t('auth.signIn'), to: { path: '/login', query: { redirect: `/${entity.slug}` } } }]"
      />
      <p v-else-if="!rows.length && status !== 'pending'" class="py-16 text-center text-muted">{{ t('shop.emptyList') }}</p>
      <ul v-else class="rows">
        <li v-for="row in rows" :key="row.id">
          <NuxtLink :to="`/${entity.slug}/${row.id}`" class="flex flex-wrap items-center gap-x-6 gap-y-1 py-4 hover:text-primary">
            <span class="font-medium text-highlighted">{{ recordTitle(entity, row) }}</span>
            <span v-for="f in summary" :key="f.name" class="text-sm text-muted"><EntityValue :field="f" :row="row" site /></span>
          </NuxtLink>
        </li>
      </ul>
    </ClientOnly>

    <div v-if="total > PAGE_SIZE" class="mt-8 flex justify-center">
      <UPagination v-model:page="page" :total="total" :items-per-page="PAGE_SIZE" />
    </div>
  </div>
</template>
