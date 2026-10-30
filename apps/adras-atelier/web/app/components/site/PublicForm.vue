<script setup lang="ts">
import { app, scheduling } from '#core/schema'
import { editableFields, type EntityMeta, type Row } from '#core/utils/meta'

// What customers and visitors fill in: a contact message, a booking, a review.
// Staff-only fields are left out here and ignored by the database even if sent.
const props = defineProps<{ entity: EntityMeta, preset?: Record<string, unknown> }>()
const emit = defineEmits<{ saved: [row: Row | null] }>()

const { user } = useAuth()
const { canAsCustomer } = usePermissions()
const records = useRecords(props.entity)
const { targetOrg, loadBusinessOrg } = useShop()
const toast = useToast()
const route = useRoute()

const fields = editableFields(props.entity, false)
const schema = formSchema(props.entity, fields)
const blank = () => reactive<Record<string, any>>(newFormState(props.entity, user.value?.id, props.preset))
const state = ref(blank())
const saving = ref(false)
const sent = ref(false)
// Real people never see this field; bots fill it in, and their message is quietly dropped.
const honeypot = ref('')
const needsAccount = computed(() => !canAsCustomer(props.entity, 'create'))

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

async function onSubmit() {
  if (honeypot.value) { sent.value = true; return }
  saving.value = true
  try {
    const target = await destination()
    const payload = formStateToPayload(props.entity, state.value, fields)
    if (props.entity.access === 'inbox') {
      await records.submit(payload, target)
      sent.value = true
      state.value = blank()
      emit('saved', null)
    } else {
      emit('saved', await records.create(payload, target))
    }
  } catch (err) {
    toast.add({ title: t('form.failed'), description: friendlyError(err, props.entity), color: 'error', icon: 'i-lucide-circle-alert' })
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
      :title="t('form.sent')"
      :description="t('form.sentNote')"
      :actions="[{ label: t('form.again'), onClick: () => { sent = false } }]"
    />
    <UAlert
      v-else-if="needsAccount"
      color="neutral"
      variant="subtle"
      icon="i-lucide-user"
      :title="t('form.signInFirst')"
      :description="t('form.signInNote')"
      :actions="[{ label: t('auth.signIn'), to: { path: '/login', query: { redirect: route.fullPath } } }]"
    />
    <UForm v-else :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <div class="absolute -left-[9999px]" aria-hidden="true">
        <label>Website <input v-model="honeypot" type="text" tabindex="-1" autocomplete="off"></label>
      </div>
      <div class="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <template v-for="f in fields" :key="f.name">
          <UFormField
            :name="f.name"
            :label="tl(f.label)"
            :description="f.help ? tl(f.help) : undefined"
            :required="f.required"
            :class="['longtext', 'json', 'tags'].includes(f.type) || f.name === slotted?.start ? 'sm:col-span-2' : ''"
          >
            <SiteSlotPicker
              v-if="f.name === slotted?.start"
              v-model="state[f.name]"
              :org="org"
              :service="slotted.service ? state[slotted.service] : undefined"
              :resource="slotted.resource ? state[slotted.resource] : undefined"
              :needs-service="Boolean(slotted.service)"
            />
            <EntityFieldInput v-else v-model="state[f.name]" :field="f" site />
          </UFormField>
        </template>
      </div>
      <UButton type="submit" size="lg" :label="entity.access === 'inbox' ? t('form.send') : t('form.submit')" :loading="saving" />
    </UForm>
    <template #fallback>
      <USkeleton class="h-48 w-full" />
    </template>
  </ClientOnly>
</template>
