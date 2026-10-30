<script setup lang="ts">
import type { InfiniteScrollCustomEvent } from '@ionic/vue'
import { commerce } from '#core/schema'
import { recordTitle, type EntityMeta, type Row } from '#core/utils/meta'

const props = withDefaults(defineProps<{
  entity: EntityMeta
  where?: Record<string, unknown>
  search?: string
  pageSize?: number
  infinite?: boolean
}>(), { pageSize: 12, infinite: false })

const records = useRecords(props.entity)
const cart = useCart()
const notify = useNotify()
const rows = ref<Row[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const isProduct = props.entity.name === commerce?.product
const priceOf = (row: Row) => formatMoney(Number(row[commerce!.price]))
const soldOut = (row: Row) => isProduct && commerce!.stock ? Number(row[commerce!.stock]) <= 0 : false
const hasPage = props.entity.access === 'public'

async function fetchPage(p: number) {
  const res = await records.list({ page: p, pageSize: props.pageSize, search: props.search, filters: props.where, scope: 'all' })
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

async function add(row: Row) {
  cart.add(row.id)
  await notify.toast(`${recordTitle(props.entity, row)} added to cart`, 'success', 1500)
}

watch(() => props.search, reload)
onMounted(reload)
defineExpose({ reload })
</script>

<template>
  <div>
    <div v-if="!loading && !rows.length" class="empty-state">
      <Icon :name="entity.icon" />
      <p>{{ search ? 'No matches.' : `No ${entity.plural.toLowerCase()} yet.` }}</p>
    </div>
    <div class="shop-grid">
      <ion-card
        v-for="row in rows"
        :key="row.id"
        class="shop-card"
        :button="hasPage"
        :router-link="hasPage ? `/${entity.slug}/${row.id}` : undefined"
      >
        <div v-if="entity.attachments" class="shop-image">
          <img v-if="row.cover_url" :src="row.cover_url" :alt="recordTitle(entity, row)" loading="lazy">
          <Icon v-else :name="entity.icon" />
        </div>
        <ion-card-header>
          <ion-card-subtitle v-if="row.seller">{{ row.seller.name }}</ion-card-subtitle>
          <div class="shop-title">{{ recordTitle(entity, row) }}</div>
          <div v-if="isProduct" class="shop-price">{{ priceOf(row) }}</div>
        </ion-card-header>
        <ion-button v-if="isProduct" expand="block" fill="clear" size="small" :disabled="soldOut(row)" @click.stop.prevent="add(row)">
          {{ soldOut(row) ? 'Sold out' : 'Add to cart' }}
        </ion-button>
      </ion-card>
    </div>
    <ion-infinite-scroll v-if="infinite" :disabled="rows.length >= total" @ion-infinite="loadMore">
      <ion-infinite-scroll-content loading-spinner="crescent" />
    </ion-infinite-scroll>
  </div>
</template>
