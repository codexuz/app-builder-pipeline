<script setup lang="ts">
import { app, scheduling } from '#core/schema'
import { editableFields, type EntityMeta, type Row } from '#core/utils/meta'

// What customers and visitors fill in: a contact message, a booking, a review.
// Staff-only fields are left out here and ignored by the database even if sent.
const props = defineProps<{ entity: EntityMeta, preset?: Record<string, unknown>, loginPath: string }>()
const emit = defineEmits<{ saved: [row: Row | null] }>()

const { user } = useAuth()
const { canAsCustomer } = usePermissions()
const records = useRecords(props.entity)
const { targetOrg, loadBusinessOrg } = useShop()
const notify = useNotify()

const fields = editableFields(props.entity, false)
const schema = formSchema(props.entity, fields)
const blank = () => newFormState(props.entity, user.value?.id, props.preset)
const state = ref<Record<string, any>>(blank())
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const sent = ref(false)
const needsAccount = computed(() => !canAsCustomer(props.entity, 'create'))
const honeypot = ref('')
const slotted = scheduling?.entity === props.entity.name ? scheduling : null
const org = ref<string | null>(null)
onMounted(async () => { if (slotted) org.value = await loadBusinessOrg() })

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
  if (honeypot.value) { sent.value = true; return }
  const parsed = schema.safeParse(state.value)
  errors.value = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.value[String(issue.path[0])] ??= issue.message
    return notify.toast(t('e.value'), 'danger')
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
    await notify.error(t('form.failed'), err)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="sent" class="empty-state">
    <Icon name="i-lucide-circle-check" />
    <p>{{ t('form.sent') }}</p>
    <ion-button fill="clear" @click="sent = false">{{ t('form.again') }}</ion-button>
  </div>
  <div v-else-if="needsAccount" class="empty-state">
    <Icon name="i-lucide-user" />
    <p>{{ t('form.signInNote') }}</p>
    <ion-button :router-link="loginPath">{{ t('auth.signIn') }}</ion-button>
  </div>
  <form v-else @submit.prevent="submit">
    <ion-list>
      <template v-for="f in fields" :key="f.name">
        <SlotPicker
          v-if="f.name === slotted?.start"
          v-model="state[f.name]"
          :label="tl(f.label)"
          :error="errors[f.name]"
          :org="org"
          :service="slotted.service ? state[slotted.service] : undefined"
          :resource="slotted.resource ? state[slotted.resource] : undefined"
          :needs-service="Boolean(slotted.service)"
        />
        <FieldInput v-else v-model="state[f.name]" :field="f" :error="errors[f.name]" site />
      </template>
      <input v-model="honeypot" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" style="position: absolute; left: -9999px">
    </ion-list>
    <div class="ion-padding">
      <ion-button type="submit" expand="block" :disabled="saving">
        {{ entity.access === 'inbox' ? t('form.send') : t('form.submit') }}
      </ion-button>
    </div>
  </form>
</template>
