<script setup lang="ts">
import { app } from '#core/schema'
import { entityByName, fieldOf, personName, recordTitle, titleSelectFor, type Profile } from '#core/utils/meta'

// Picks a related record (`to` = entity name) or, without `to`, a person.
const props = defineProps<{ label: string, to?: string, required?: boolean, site?: boolean }>()
const model = defineModel<string | null | undefined>()

const sb = useSupabase()
const { current } = useWorkspace()
const target = props.to ? entityByName(props.to)! : undefined
const open = ref(false)
const search = ref('')
const loading = ref(false)
const options = ref<{ id: string, label: string }[]>([])
const selectedLabel = ref('')

const clean = (s: string) => s.replace(/[,()%*\\]/g, ' ').trim()

async function fetchOptions() {
  loading.value = true
  try {
    const term = clean(search.value)
    if (target) {
      let q = sb.from(target.name).select(titleSelectFor(target)).limit(30)
      if (target.access !== 'members' && !props.site) q = q.eq('org_id', current.value!.id)
      const tf = fieldOf(target, target.title)
      if (term && tf && ['text', 'email', 'phone', 'longtext'].includes(tf.type)) q = q.ilike(target.title, `%${term}%`)
      q = tf && !tf.alias ? q.order(target.title) : q.order('created_at', { ascending: false })
      const { data, error } = await q
      if (error) throw error
      options.value = (data ?? []).map((r: any) => ({ id: r.id, label: recordTitle(target, r) }))
    } else if (app.publicProfiles) {
      let q = sb.from('profiles').select('id, full_name, email').order('full_name').limit(30)
      if (term) q = q.or(`full_name.ilike.*${term}*,email.ilike.*${term}*`)
      const { data, error } = await q
      if (error) throw error
      options.value = (data ?? []).map(p => ({ id: p.id, label: personName(p as Profile) }))
    } else {
      const { data, error } = await sb.from('memberships').select('profiles(id, full_name, email)').eq('org_id', current.value!.id)
      if (error) throw error
      options.value = (data ?? []).map((m: any) => m.profiles).filter(Boolean)
        .map((p: Profile) => ({ id: p.id, label: personName(p) }))
        .filter(o => !term || o.label.toLowerCase().includes(term.toLowerCase()))
    }
  } finally {
    loading.value = false
  }
}

async function loadSelectedLabel() {
  if (!model.value) { selectedLabel.value = ''; return }
  const known = options.value.find(o => o.id === model.value)
  if (known) { selectedLabel.value = known.label; return }
  if (target) {
    const { data } = await sb.from(target.name).select(titleSelectFor(target)).eq('id', model.value).maybeSingle()
    selectedLabel.value = data ? recordTitle(target, data) : ''
  } else {
    const { data } = await sb.from('profiles').select('id, full_name, email').eq('id', model.value).maybeSingle()
    selectedLabel.value = data ? personName(data as Profile) : ''
  }
}

function choose(id: string | null) {
  model.value = id
  selectedLabel.value = options.value.find(o => o.id === id)?.label ?? ''
  open.value = false
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(fetchOptions, 250)
})
watch(open, (isOpen) => { if (isOpen) fetchOptions() })
watch(model, loadSelectedLabel, { immediate: true })
</script>

<template>
  <ion-item button :detail="true" @click="open = true">
    <ion-label>
      <p class="picker-label">{{ label }}{{ required ? ' *' : '' }}</p>
      <h3 :class="{ muted: !selectedLabel }">{{ selectedLabel || `Choose ${label.toLowerCase()}` }}</h3>
    </ion-label>
  </ion-item>

  <ion-modal :is-open="open" :initial-breakpoint="0.75" :breakpoints="[0, 0.75, 1]" @did-dismiss="open = false">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ label }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="open = false">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar v-model="search" :debounce="0" :placeholder="`Search ${target ? target.plural.toLowerCase() : 'people'}`" />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-progress-bar v-if="loading" type="indeterminate" />
      <ion-list>
        <ion-item v-if="!required && model" button @click="choose(null)">
          <ion-label class="muted">None</ion-label>
        </ion-item>
        <ion-item v-for="o in options" :key="o.id" button @click="choose(o.id)">
          <ion-label>{{ o.label }}</ion-label>
          <Icon v-if="o.id === model" slot="end" name="i-lucide-check" style="color: var(--ion-color-primary)" />
        </ion-item>
      </ion-list>
      <p v-if="!loading && !options.length" class="empty-state">Nothing found.</p>
    </ion-content>
  </ion-modal>
</template>
