<script setup lang="ts">
import type { EntityMeta } from '#core/utils/meta'

const props = withDefaults(defineProps<{
  entity: EntityMeta
  where?: Record<string, unknown>
  limit?: number
}>(), { limit: 8 })

// Rendered on the server for visitors, so search engines and link previews see real content.
const { data, error } = await useAsyncData(
  `grid:${props.entity.name}:${props.limit}:${JSON.stringify(props.where ?? {})}`,
  () => useRecords(props.entity).list({ page: 1, pageSize: props.limit, filters: props.where, scope: 'all' })
)
</script>

<template>
  <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="`Could not load ${entity.plural.toLowerCase()}`" />
  <p v-else-if="!data?.rows.length" class="py-8 text-center text-sm text-muted">No {{ entity.plural.toLowerCase() }} yet.</p>
  <div v-else class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
    <SiteRecordCard v-for="row in data.rows" :key="row.id" :entity="entity" :row="row" />
  </div>
</template>
