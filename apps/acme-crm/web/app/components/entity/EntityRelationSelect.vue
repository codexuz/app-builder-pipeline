<script setup lang="ts">
import { entityByName, fieldOf, recordTitle, titleSelectFor } from '#core/utils/meta'

const props = defineProps<{ to: string, required?: boolean, site?: boolean }>()
const model = defineModel<string | null | undefined>()

const target = entityByName(props.to)!
const sb = useSupabase()
const { current } = useWorkspace()
const search = ref('')
const loading = ref(false)
const items = ref<{ label: string, value: string }[]>([])
const selected = ref<{ label: string, value: string } | null>(null)
const titleField = fieldOf(target, target.title)

async function load() {
  loading.value = true
  try {
    let q = sb.from(target.name).select(titleSelectFor(target)).limit(25)
    if (target.access !== 'members' && !props.site) q = q.eq('org_id', current.value!.id)
    const term = search.value.replace(/[,()%*\\]/g, ' ').trim()
    if (term && titleField && ['text', 'email', 'phone', 'longtext'].includes(titleField.type)) q = q.ilike(target.title, `%${term}%`)
    q = titleField && !titleField.alias ? q.order(target.title) : q.order('created_at', { ascending: false })
    const { data, error } = await q
    if (error) throw error
    items.value = (data ?? []).map((r: any) => ({ label: recordTitle(target, r), value: r.id }))
  } finally {
    loading.value = false
  }
}

// Make sure the current value has a label even when it is not in the first page of results.
async function loadSelected() {
  if (!model.value) { selected.value = null; return }
  if (items.value.some(i => i.value === model.value)) return
  const { data } = await sb.from(target.name).select(titleSelectFor(target)).eq('id', model.value).maybeSingle()
  if (data) selected.value = { label: recordTitle(target, data), value: (data as any).id }
}

const options = computed(() => {
  const list = [...items.value]
  if (selected.value && !list.some(i => i.value === selected.value!.value)) list.unshift(selected.value)
  return list
})

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(timer)
  timer = setTimeout(load, 250)
})
watch(model, loadSelected)
onMounted(() => Promise.all([load(), loadSelected()]))
</script>

<template>
  <div class="flex w-full gap-1">
    <USelectMenu
      :model-value="model ?? undefined"
      v-model:search-term="search"
      :items="options"
      value-key="value"
      :loading="loading"
      ignore-filter
      :placeholder="`Select ${target.label.toLowerCase()}`"
      :search-input="{ placeholder: `Search ${target.plural.toLowerCase()}…` }"
      class="flex-1"
      @update:model-value="(v: string) => (model = v)"
    />
    <UButton
      v-if="model && !required"
      icon="i-lucide-x"
      color="neutral"
      variant="ghost"
      :aria-label="`Clear ${target.label.toLowerCase()}`"
      @click="model = null"
    />
  </div>
</template>
