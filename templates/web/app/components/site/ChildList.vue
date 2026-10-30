<script setup lang="ts">
import { isPublicEntity, recordTitle, type EntityMeta } from '#core/utils/meta'

// Records that belong to the page's record: reviews of a product, lines of an order.
const props = defineProps<{ entity: EntityMeta, where: Record<string, unknown> }>()

const shared = isPublicEntity(props.entity)
const { data } = await useAsyncData(
  `children:${props.entity.name}:${JSON.stringify(props.where)}`,
  () => useRecords(props.entity).list({ page: 1, pageSize: 50, filters: props.where, scope: shared ? 'all' : 'mine' }),
  { server: shared }
)
const hide = new Set(Object.keys(props.where))
const fields = props.entity.fields.filter(f => f.list && !f.auto && !hide.has(f.name) && f.name !== props.entity.title)
</script>

<template>
  <p v-if="!data?.rows.length" class="text-sm text-muted">No {{ entity.plural.toLowerCase() }} yet.</p>
  <ul v-else class="divide-y divide-default rounded-lg border border-default">
    <li v-for="row in data.rows" :key="row.id" class="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 p-4 text-sm">
      <span class="font-medium text-highlighted">{{ recordTitle(entity, row) }}</span>
      <span class="flex flex-wrap items-center gap-x-6 gap-y-1 text-muted">
        <EntityValue v-for="f in fields" :key="f.name" :field="f" :row="row" site />
      </span>
    </li>
  </ul>
</template>
