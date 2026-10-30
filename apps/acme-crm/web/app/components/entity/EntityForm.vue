<script setup lang="ts">
import type { EntityMeta, Row } from '#core/utils/meta'

const props = defineProps<{ entity: EntityMeta, record?: Row | null, preset?: Record<string, unknown> }>()
const emit = defineEmits<{ saved: [row: Row], cancel: [] }>()

const { user } = useAuth()
const records = useRecords(props.entity)
const toast = useToast()
const saving = ref(false)

const fields = editableFields(props.entity, true)
const schema = formSchema(props.entity, fields)
const state = reactive<Record<string, any>>(
  props.record ? rowToFormState(props.entity, props.record) : newFormState(props.entity, user.value?.id, props.preset)
)
const wide = (type: string) => ['longtext', 'json', 'tags'].includes(type)

async function onSubmit() {
  saving.value = true
  try {
    const payload = formStateToPayload(props.entity, state, fields)
    const row = props.record ? await records.update(props.record.id, payload) : await records.create(payload)
    toast.add({ title: `${props.entity.label} ${props.record ? 'updated' : 'created'}`, color: 'success', icon: 'i-lucide-check' })
    emit('saved', row)
  } catch (err) {
    toast.add({ title: 'Could not save', description: friendlyError(err, props.entity), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UForm :schema="schema" :state="state" class="space-y-6" @submit="onSubmit">
    <div class="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <UFormField
        v-for="f in fields"
        :key="f.name"
        :name="f.name"
        :label="tl(f.label)"
        :description="f.help"
        :required="f.required"
        :class="wide(f.type) ? 'sm:col-span-2' : ''"
      >
        <EntityFieldInput v-model="state[f.name]" :field="f" />
      </UFormField>
    </div>
    <div class="flex justify-end gap-2 border-t border-default pt-4">
      <UButton label="Cancel" color="neutral" variant="ghost" @click="emit('cancel')" />
      <UButton type="submit" :label="record ? 'Save changes' : `Create ${entity.label.toLowerCase()}`" :loading="saving" icon="i-lucide-check" />
    </div>
  </UForm>
</template>
