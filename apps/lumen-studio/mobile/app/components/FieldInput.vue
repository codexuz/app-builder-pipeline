<script setup lang="ts">
import type { FieldMeta } from '#core/utils/meta'

// `site`: a customer or visitor filling this in, who has no workspace to search within.
const props = defineProps<{ field: FieldMeta, error?: string, site?: boolean }>()
const model = defineModel<any>()

const label = computed(() => props.field.label + (props.field.required ? ' *' : ''))
type InputType = 'text' | 'email' | 'tel' | 'url' | 'date' | 'datetime-local'
const INPUT_TYPES: Record<string, InputType> = { email: 'email', phone: 'tel', url: 'url', date: 'date', datetime: 'datetime-local' }
const inputType = computed<InputType>(() => INPUT_TYPES[props.field.type] ?? 'text')
const numeric = computed(() => ['integer', 'number', 'money', 'percent'].includes(props.field.type))

function onNumber(e: CustomEvent) {
  const raw = String(e.detail.value ?? '').trim()
  model.value = raw === '' || Number.isNaN(Number(raw)) ? null : Number(raw)
}

const tagDraft = ref('')
function addTag() {
  const t = tagDraft.value.trim()
  if (t && !(model.value ?? []).includes(t)) model.value = [...(model.value ?? []), t]
  tagDraft.value = ''
}
const removeTag = (t: string) => { model.value = (model.value ?? []).filter((x: string) => x !== t) }
</script>

<template>
  <div>
    <ion-item v-if="field.type === 'longtext' || field.type === 'json'">
      <ion-textarea v-model="model" :label="label" label-placement="stacked" auto-grow :rows="field.type === 'json' ? 5 : 3" :maxlength="field.max" />
    </ion-item>
    <ion-item v-else-if="numeric">
      <ion-input
        :value="model ?? ''"
        :label="label"
        label-placement="stacked"
        type="number"
        :inputmode="field.type === 'integer' ? 'numeric' : 'decimal'"
        :min="field.min"
        :max="field.max"
        @ion-input="onNumber"
      >
        <span v-if="field.type === 'percent'" slot="end" class="muted">%</span>
      </ion-input>
    </ion-item>
    <ion-item v-else-if="field.type === 'boolean'">
      <ion-toggle v-model="model">{{ field.label }}</ion-toggle>
    </ion-item>
    <ion-item v-else-if="field.type === 'enum'">
      <ion-select v-model="model" :label="label" label-placement="stacked" interface="action-sheet" :placeholder="`Select ${field.label.toLowerCase()}`">
        <ion-select-option v-for="o in optionItems(field)" :key="o.value" :value="o.value">{{ o.label }}</ion-select-option>
      </ion-select>
    </ion-item>
    <template v-else-if="field.type === 'tags'">
      <ion-item>
        <ion-input v-model="tagDraft" :label="label" label-placement="stacked" placeholder="Type and tap add" enterkeyhint="done" @keyup.enter="addTag" />
        <ion-button slot="end" fill="clear" :disabled="!tagDraft.trim()" @click="addTag">Add</ion-button>
      </ion-item>
      <div v-if="model?.length" class="ion-padding-horizontal">
        <ion-chip v-for="t in model" :key="t" @click="removeTag(t)">
          <ion-label>{{ t }}</ion-label>
          <Icon name="i-lucide-x" />
        </ion-chip>
      </div>
    </template>
    <RecordPicker v-else-if="field.type === 'relation'" v-model="model" :label="field.label" :to="field.to" :required="field.required" :site="site" />
    <RecordPicker v-else-if="field.type === 'user'" v-model="model" :label="field.label" :required="field.required" />
    <ion-item v-else>
      <ion-input v-model="model" :label="label" label-placement="stacked" :type="inputType" :maxlength="field.max" />
    </ion-item>
    <ion-note v-if="field.help && !error" class="field-error muted">{{ field.help }}</ion-note>
    <span v-if="error" class="field-error">{{ error }}</span>
  </div>
</template>
