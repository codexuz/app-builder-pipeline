<script setup lang="ts">
import { app } from '#core/schema'
import { editableFields, type EntityMeta, type Row } from '#core/utils/meta'

// What customers and visitors fill in: a contact message, a booking, a review.
// Staff-only fields are left out here and ignored by the database even if sent.
const props = defineProps<{ entity: EntityMeta, preset?: Record<string, unknown> }>()
const emit = defineEmits<{ saved: [row: Row | null] }>()

const { user } = useAuth()
const { canAsCustomer } = usePermissions()
const records = useRecords(props.entity)
const { targetOrg } = useShop()
const toast = useToast()
const route = useRoute()

const fields = editableFields(props.entity, false)
const schema = formSchema(props.entity, fields)
const blank = () => reactive<Record<string, any>>(newFormState(props.entity, user.value?.id, props.preset))
const state = ref(blank())
const saving = ref(false)
const sent = ref(false)
const needsAccount = computed(() => !canAsCustomer(props.entity, 'create'))
const presetNames = new Set(Object.keys(props.preset ?? {}))

// In a marketplace a record goes to the seller of whatever it is about.
async function destination() {
  if (app.type !== 'marketplace') return targetOrg()
  const link = fields.find(f => f.type === 'relation' && f.required && state.value[f.name])
  if (!link) return targetOrg()
  const { data, error } = await useSupabase().from(link.to!).select('org_id').eq('id', state.value[link.name]).single()
  if (error) throw error
  return targetOrg(data.org_id)
}

async function onSubmit() {
  saving.value = true
  try {
    const org = await destination()
    const payload = formStateToPayload(props.entity, state.value, fields)
    if (props.entity.access === 'inbox') {
      await records.submit(payload, org)
      sent.value = true
      state.value = blank()
      emit('saved', null)
    } else {
      emit('saved', await records.create(payload, org))
    }
  } catch (err) {
    toast.add({ title: 'Could not send', description: friendlyError(err, props.entity), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ClientOnly>
    <UAlert
      v-if="sent"
      color="success"
      variant="subtle"
      icon="i-lucide-circle-check"
      title="Thank you, we received your message"
      description="We will get back to you soon."
      :actions="[{ label: 'Send another', onClick: () => { sent = false } }]"
    />
    <UAlert
      v-else-if="needsAccount"
      color="neutral"
      variant="subtle"
      icon="i-lucide-user"
      title="Sign in to continue"
      description="You need an account so you can follow this later."
      :actions="[{ label: 'Sign in', to: { path: '/login', query: { redirect: route.fullPath } } }]"
    />
    <UForm v-else :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <div class="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <template v-for="f in fields" :key="f.name">
          <UFormField
            v-if="!presetNames.has(f.name)"
            :name="f.name"
            :label="f.label"
            :description="f.help"
            :required="f.required"
            :class="['longtext', 'json', 'tags'].includes(f.type) ? 'sm:col-span-2' : ''"
          >
            <EntityFieldInput v-model="state[f.name]" :field="f" site />
          </UFormField>
        </template>
      </div>
      <UButton type="submit" :label="entity.access === 'inbox' ? 'Send' : `Submit ${entity.label.toLowerCase()}`" :loading="saving" />
    </UForm>
    <template #fallback>
      <USkeleton class="h-48 w-full" />
    </template>
  </ClientOnly>
</template>
