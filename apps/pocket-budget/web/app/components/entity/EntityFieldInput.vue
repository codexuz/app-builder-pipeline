<script setup lang="ts">
import type { FieldMeta } from '#core/utils/meta'

const props = defineProps<{ field: FieldMeta }>()
const model = defineModel<any>()

const inputType = computed(() => ({ email: 'email', phone: 'tel', url: 'url', date: 'date', datetime: 'datetime-local' } as Record<string, string>)[props.field.type] ?? 'text')
const step = computed(() => props.field.type === 'integer' ? 1 : 0.01)
const numberFormat = computed(() => props.field.type === 'integer'
  ? { maximumFractionDigits: 0 }
  : { minimumFractionDigits: props.field.type === 'money' ? 2 : 0, maximumFractionDigits: 2 })
</script>

<template>
  <UTextarea v-if="field.type === 'longtext'" v-model="model" :rows="4" autoresize :maxrows="12" class="w-full" />
  <UTextarea v-else-if="field.type === 'json'" v-model="model" :rows="5" autoresize class="w-full font-mono text-xs" placeholder="{ }" />
  <UInputNumber
    v-else-if="['integer', 'number', 'money', 'percent'].includes(field.type)"
    v-model="model"
    :min="field.min ?? (field.type === 'percent' ? 0 : undefined)"
    :max="field.max ?? (field.type === 'percent' ? 100 : undefined)"
    :step="step"
    :format-options="numberFormat"
    class="w-full"
  />
  <USwitch v-else-if="field.type === 'boolean'" v-model="model" />
  <USelect
    v-else-if="field.type === 'enum'"
    v-model="model"
    :items="optionItems(field)"
    :placeholder="`Select ${field.label.toLowerCase()}`"
    class="w-full"
  />
  <UInputTags v-else-if="field.type === 'tags'" v-model="model" placeholder="Type and press Enter" class="w-full" />
  <EntityRelationSelect v-else-if="field.type === 'relation'" v-model="model" :to="field.to!" :required="field.required" />
  <EntityMemberSelect v-else-if="field.type === 'user'" v-model="model" :required="field.required" />
  <UInput v-else v-model="model" :type="inputType" class="w-full" :maxlength="field.max" />
</template>
