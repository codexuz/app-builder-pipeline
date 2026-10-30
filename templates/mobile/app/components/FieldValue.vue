<script setup lang="ts">
import { entityByName, personName, recordTitle, type FieldMeta } from '#core/utils/meta'

const props = defineProps<{ field: FieldMeta, row: Record<string, any> }>()

const value = computed(() => props.row[props.field.name])
const embedded = computed(() => props.field.alias ? props.row[props.field.alias] : undefined)
const target = computed(() => props.field.type === 'relation' ? entityByName(props.field.to!) : undefined)
const empty = computed(() => value.value === null || value.value === undefined || value.value === '' || (Array.isArray(value.value) && !value.value.length))
const ionColor = (c: string) => ({ error: 'danger', info: 'tertiary', neutral: 'medium', secondary: 'secondary' } as Record<string, string>)[c] ?? c
</script>

<template>
  <span v-if="empty" class="muted">—</span>
  <ion-badge v-else-if="field.type === 'enum'" :color="ionColor(optionColor(field, value))">{{ humanize(value) }}</ion-badge>
  <span v-else-if="field.type === 'relation' && target && embedded">{{ recordTitle(target, embedded) }}</span>
  <span v-else-if="field.type === 'user'">{{ personName(embedded) }}</span>
  <a v-else-if="field.type === 'url'" :href="value" target="_blank" rel="noopener">{{ value.replace(/^https?:\/\//, '') }}</a>
  <a v-else-if="field.type === 'email'" :href="`mailto:${value}`">{{ value }}</a>
  <a v-else-if="field.type === 'phone'" :href="`tel:${value}`">{{ value }}</a>
  <span v-else-if="field.type === 'tags'">
    <ion-chip v-for="t in value" :key="t" outline>{{ t }}</ion-chip>
  </span>
  <span v-else-if="field.type === 'longtext'" style="white-space: pre-line">{{ value }}</span>
  <span v-else :class="{ tabular: ['money', 'number', 'integer', 'percent'].includes(field.type) }">{{ formatValue(field, value) }}</span>
</template>
