<script setup lang="ts">
import type { EntityMeta, Row } from '#core/utils/meta'

const props = defineProps<{ entity: EntityMeta, record?: Row | null, preset?: Record<string, unknown> }>()
const emit = defineEmits<{ saved: [row: Row] }>()

const { user } = useAuth()
const records = useRecords(props.entity)
const notify = useNotify()
const saving = ref(false)
const errors = ref<Record<string, string>>({})

const fields = editableFields(props.entity, true)
const schema = formSchema(props.entity, fields)
const state = reactive<Record<string, any>>(
  props.record ? rowToFormState(props.entity, props.record) : newFormState(props.entity, user.value?.id, props.preset)
)

// Same zod schema as the web app, so both clients enforce identical rules before the database does.
async function submit() {
  const parsed = schema.safeParse(state)
  errors.value = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0])
      errors.value[key] ??= issue.message
    }
    await notify.toast('Check the highlighted fields', 'danger')
    return
  }
  saving.value = true
  try {
    const payload = formStateToPayload(props.entity, state, fields)
    const row = props.record ? await records.update(props.record.id, payload) : await records.create(payload)
    await notify.toast(`${props.entity.label} ${props.record ? 'updated' : 'created'}`, 'success')
    emit('saved', row)
  } catch (err) {
    await notify.error('Could not save', err)
  } finally {
    saving.value = false
  }
}

defineExpose({ submit, saving })
</script>

<template>
  <form @submit.prevent="submit">
    <ion-list>
      <FieldInput v-for="f in fields" :key="f.name" v-model="state[f.name]" :field="f" :error="errors[f.name]" />
    </ion-list>
    <div class="ion-padding">
      <ion-button type="submit" expand="block" :disabled="saving">
        <ion-spinner v-if="saving" slot="start" name="crescent" />
        {{ record ? 'Save changes' : `Create ${entity.label.toLowerCase()}` }}
      </ion-button>
    </div>
  </form>
</template>
