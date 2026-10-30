<script setup lang="ts">
import { app } from '#core/schema'
import { editableFields, type EntityMeta, type Row } from '#core/utils/meta'

// What customers and visitors fill in: a contact message, a booking, a review.
// Staff-only fields are left out here and ignored by the database even if sent.
const props = defineProps<{ entity: EntityMeta, preset?: Record<string, unknown>, loginPath: string }>()
const emit = defineEmits<{ saved: [row: Row | null] }>()

const { user } = useAuth()
const { canAsCustomer } = usePermissions()
const records = useRecords(props.entity)
const { targetOrg } = useShop()
const notify = useNotify()

const fields = editableFields(props.entity, false)
const shown = fields.filter(f => props.preset?.[f.name] === undefined)
const schema = formSchema(props.entity, fields)
const blank = () => newFormState(props.entity, user.value?.id, props.preset)
const state = ref<Record<string, any>>(blank())
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const sent = ref(false)
const needsAccount = computed(() => !canAsCustomer(props.entity, 'create'))

// In a marketplace a record goes to the seller of whatever it is about.
async function destination() {
  if (app.type !== 'marketplace') return targetOrg()
  const link = fields.find(f => f.type === 'relation' && f.required && state.value[f.name])
  if (!link) return targetOrg()
  const { data, error } = await useSupabase().from(link.to!).select('org_id').eq('id', state.value[link.name]).single()
  if (error) throw error
  return targetOrg(data.org_id)
}

async function submit() {
  const parsed = schema.safeParse(state.value)
  errors.value = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.value[String(issue.path[0])] ??= issue.message
    return notify.toast('Check the highlighted fields', 'danger')
  }
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
    await notify.error('Could not send', err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="sent" class="empty-state">
    <Icon name="i-lucide-circle-check" />
    <p>Thank you, we received your message.</p>
    <ion-button fill="clear" @click="sent = false">Send another</ion-button>
  </div>
  <div v-else-if="needsAccount" class="empty-state">
    <Icon name="i-lucide-user" />
    <p>Sign in so you can follow this later.</p>
    <ion-button :router-link="loginPath">Sign in</ion-button>
  </div>
  <form v-else @submit.prevent="submit">
    <ion-list>
      <FieldInput v-for="f in shown" :key="f.name" v-model="state[f.name]" :field="f" :error="errors[f.name]" site />
    </ion-list>
    <div class="ion-padding">
      <ion-button type="submit" expand="block" :disabled="saving">
        {{ entity.access === 'inbox' ? 'Send' : `Submit ${entity.label.toLowerCase()}` }}
      </ion-button>
    </div>
  </form>
</template>
