<script setup lang="ts">
import type { InfiniteScrollCustomEvent } from '@ionic/vue'
import { entityByName, personName, recordTitle, type EntityMeta, type FieldMeta, type Row } from '#core/utils/meta'

const props = withDefaults(defineProps<{
  entity: EntityMeta
  where?: Record<string, unknown>
  search?: string
  scope?: 'workspace' | 'all' | 'mine'
  pageSize?: number
  infinite?: boolean
  // Where a row opens; defaults to the staff page under /app.
  linkTo?: (row: Row) => string
}>(), { pageSize: 25, infinite: true })

const records = useRecords(props.entity)
const notify = useNotify()
const rows = ref<Row[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)

const hidden = computed(() => new Set(Object.keys(props.where ?? {})))
const badgeField = computed(() => props.entity.fields.find(f => f.type === 'enum' && f.list && !hidden.value.has(f.name)))
const subtitleFields = computed(() => props.entity.fields
  .filter(f => f.list && f.name !== props.entity.title && f !== badgeField.value && !hidden.value.has(f.name) && !['longtext', 'json', 'tags'].includes(f.type))
  .slice(0, 2))
const ionColor = (c: string) => ({ error: 'danger', info: 'tertiary', neutral: 'medium' } as Record<string, string>)[c] ?? c

function text(f: FieldMeta, row: Row) {
  if (f.type === 'relation') return row[f.alias!] ? recordTitle(entityByName(f.to!)!, row[f.alias!]) : ''
  if (f.type === 'user') return row[f.alias!] ? personName(row[f.alias!]) : ''
  const v = formatValue(f, row[f.name])
  return v === '—' ? '' : v
}
const subtitle = (row: Row) => subtitleFields.value.map(f => text(f, row)).filter(Boolean).join(' · ')

async function fetchPage(p: number) {
  const res = await records.list({ page: p, pageSize: props.pageSize, search: props.search, filters: props.where, scope: props.scope })
  total.value = res.total
  rows.value = p === 1 ? res.rows : [...rows.value, ...res.rows]
  page.value = p
}

async function reload() {
  loading.value = true
  try {
    await fetchPage(1)
  } catch (err) {
    await notify.error(`Could not load ${props.entity.plural.toLowerCase()}`, err)
  } finally {
    loading.value = false
  }
}

async function loadMore(ev: InfiniteScrollCustomEvent) {
  try {
    await fetchPage(page.value + 1)
  } finally {
    await ev.target.complete()
  }
}

watch(() => [props.search, props.scope], reload)

let unsubscribe = () => {}
let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  reload()
  unsubscribe = records.subscribe(() => {
    clearTimeout(timer)
    timer = setTimeout(reload, 400)
  }, props.scope)
})
onBeforeUnmount(() => unsubscribe())

// Pages call this from onIonViewWillEnter: Ionic keeps pages alive in its stack, so data must refresh on return.
defineExpose({ reload: () => { if (!loading.value) return reload() } })
</script>

<template>
  <div>
    <ion-list v-if="loading && !rows.length">
      <ion-item v-for="i in 4" :key="i">
        <ion-label>
          <h2><ion-skeleton-text animated style="width: 60%" /></h2>
          <p><ion-skeleton-text animated style="width: 40%" /></p>
        </ion-label>
      </ion-item>
    </ion-list>

    <div v-else-if="!rows.length" class="empty-state">
      <Icon :name="entity.icon" />
      <p>{{ search ? 'No matches.' : `No ${entity.plural.toLowerCase()} yet.` }}</p>
    </div>

    <ion-list v-else>
      <ion-item v-for="row in rows" :key="row.id" :router-link="linkTo ? linkTo(row) : `/app/${entity.slug}/${row.id}`" button>
        <ion-label>
          <h2>{{ recordTitle(entity, row) }}</h2>
          <p v-if="subtitle(row)">{{ subtitle(row) }}</p>
        </ion-label>
        <ion-badge v-if="badgeField && row[badgeField.name]" slot="end" :color="ionColor(optionColor(badgeField, row[badgeField.name]))">
          {{ humanize(row[badgeField.name]) }}
        </ion-badge>
      </ion-item>
    </ion-list>

    <ion-infinite-scroll v-if="infinite" :disabled="rows.length >= total" @ion-infinite="loadMore">
      <ion-infinite-scroll-content loading-spinner="crescent" />
    </ion-infinite-scroll>
  </div>
</template>
