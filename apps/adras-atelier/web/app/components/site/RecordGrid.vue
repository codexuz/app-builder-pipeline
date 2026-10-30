<script setup lang="ts">
import { app, commerce, scheduling } from '#core/schema'
import { entityByName, recordTitle, type EntityMeta, type Row } from '#core/utils/meta'

const props = withDefaults(defineProps<{
  entity: EntityMeta
  where?: Record<string, unknown>
  limit?: number
}>(), { limit: 8 })

const isProduct = props.entity.name === commerce?.product
// Services read as a price list; people and things as a grid.
const serviceName = scheduling?.service
const serviceField = serviceName ? entityByName(scheduling!.entity)?.fields.find(f => f.name === serviceName) : undefined
const isService = serviceField?.to === props.entity.name
const money = props.entity.fields.find(f => f.type === 'money')
const asList = !isProduct && Boolean(money) && (app.style === 'studio' || isService)
const note = props.entity.fields.find(f => f.type === 'longtext')
const booking = scheduling ? entityByName(scheduling.entity) : undefined

const { data, error } = await useAsyncData(
  `grid:${props.entity.name}:${props.limit}:${JSON.stringify(props.where ?? {})}`,
  () => useRecords(props.entity).list({ page: 1, pageSize: props.limit, filters: props.where, scope: 'all' })
)
const bookLink = (row: Row) => booking ? { path: `/${booking.slug}/new`, query: { [scheduling!.service!]: row.id } } : `/${props.entity.slug}/${row.id}`
</script>

<template>
  <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="t('form.couldNotLoad')" />
  <p v-else-if="!data?.rows.length" class="py-8 text-center text-muted">{{ t('shop.emptyList') }}</p>
  <div v-else-if="asList" class="rows">
    <div v-for="row in data.rows" :key="row.id" class="row">
      <NuxtLink :to="`/${entity.slug}/${row.id}`" class="row__name">{{ recordTitle(entity, row) }}</NuxtLink>
      <span class="row__price">{{ formatMoney(Number(row[money!.name])) }}</span>
      <p v-if="note && row[note.name]" class="row__note">{{ localized(row, note.name) }}</p>
      <UButton v-if="isService" :to="bookLink(row)" :label="t('book.now')" size="sm" variant="soft" class="justify-self-end" />
    </div>
  </div>
  <div v-else class="site-grid">
    <SiteRecordCard v-for="row in data.rows" :key="row.id" :entity="entity" :row="row" />
  </div>
</template>
