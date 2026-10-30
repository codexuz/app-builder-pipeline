<script setup lang="ts">
import { entityByName, personName, recordTitle, type FieldMeta } from '#core/utils/meta'

// `site`: shown on the public site, where links stay out of the staff area.
const props = defineProps<{ field: FieldMeta, row: Record<string, any>, site?: boolean }>()

const value = computed(() => props.row[props.field.name])
const target = computed(() => props.field.type === 'relation' ? entityByName(props.field.to!) : undefined)
const embedded = computed(() => props.field.alias ? props.row[props.field.alias] : undefined)
</script>

<template>
  <span v-if="value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)" class="text-dimmed">—</span>
  <UBadge v-else-if="field.type === 'enum'" :label="humanize(value)" :color="optionColor(field, value)" variant="subtle" />
  <UIcon v-else-if="field.type === 'boolean'" :name="value ? 'i-lucide-circle-check' : 'i-lucide-circle'" :class="value ? 'text-success' : 'text-dimmed'" class="size-4" />
  <span v-else-if="field.name === 'rating' && field.type === 'integer'" class="inline-flex" :aria-label="`${value} out of ${field.max ?? 5}`">
    <UIcon v-for="n in (field.max ?? 5)" :key="n" name="i-lucide-star" class="size-4" :class="n <= value ? 'text-warning' : 'text-dimmed'" />
  </span>
  <ULink v-else-if="field.type === 'relation' && target && embedded" :to="site ? `/${target.slug}/${embedded.id}` : `/app/${target.slug}/${embedded.id}`" class="text-highlighted hover:text-primary">
    {{ recordTitle(target, embedded) }}
  </ULink>
  <span v-else-if="field.type === 'user'" class="inline-flex items-center gap-1.5">
    <UAvatar :alt="personName(embedded)" :src="embedded?.avatar_url ?? undefined" size="3xs" />
    {{ personName(embedded) }}
  </span>
  <ULink v-else-if="field.type === 'url'" :to="value" target="_blank" external class="text-primary hover:underline">
    {{ value.replace(/^https?:\/\//, '') }}
  </ULink>
  <ULink v-else-if="field.type === 'email'" :to="`mailto:${value}`" external class="text-primary hover:underline">{{ value }}</ULink>
  <ULink v-else-if="field.type === 'phone'" :to="`tel:${value}`" external class="hover:text-primary">{{ value }}</ULink>
  <span v-else-if="field.type === 'tags'" class="inline-flex flex-wrap gap-1">
    <UBadge v-for="t in value" :key="t" :label="t" color="neutral" variant="outline" size="sm" />
  </span>
  <pre v-else-if="field.type === 'json'" class="text-xs whitespace-pre-wrap">{{ JSON.stringify(value, null, 2) }}</pre>
  <span v-else-if="field.type === 'longtext'" class="whitespace-pre-line">{{ value }}</span>
  <span v-else :class="['money', 'number', 'integer', 'percent'].includes(field.type) ? 'tabular-nums' : ''">{{ formatValue(field, value) }}</span>
</template>
