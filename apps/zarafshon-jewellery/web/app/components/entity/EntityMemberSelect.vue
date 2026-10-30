<script setup lang="ts">
import { app } from '#core/schema'
import { personName, type Profile } from '#core/utils/meta'

defineProps<{ required?: boolean, placeholder?: string }>()
const model = defineModel<string | null | undefined>()

const sb = useSupabase()
const { current } = useWorkspace()
const search = ref('')
const loading = ref(false)
const people = ref<Profile[]>([])

// Team apps pick from workspace members; apps with public profiles search every user.
async function load() {
  loading.value = true
  try {
    if (app.publicProfiles) {
      let q = sb.from('profiles').select('id, full_name, email, avatar_url').order('full_name').limit(25)
      const term = search.value.replace(/[,()%*\\]/g, ' ').trim()
      if (term) q = q.or(`full_name.ilike.*${term}*,email.ilike.*${term}*`)
      const { data, error } = await q
      if (error) throw error
      people.value = (data ?? []) as Profile[]
      // Keep the chosen person selectable even when the search no longer matches them.
      if (model.value && !people.value.some(p => p.id === model.value)) {
        const { data: chosen } = await sb.from('profiles').select('id, full_name, email, avatar_url').eq('id', model.value).maybeSingle()
        if (chosen) people.value.unshift(chosen as Profile)
      }
    } else {
      const { data, error } = await sb.from('memberships')
        .select('profiles(id, full_name, email, avatar_url)')
        .eq('org_id', current.value!.id)
      if (error) throw error
      people.value = (data ?? []).map((m: any) => m.profiles).filter(Boolean)
    }
  } finally {
    loading.value = false
  }
}

const items = computed(() => people.value.map(p => ({
  label: personName(p),
  value: p.id,
  avatar: { src: p.avatar_url ?? undefined, alt: personName(p) }
})))

let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  if (!app.publicProfiles) return
  clearTimeout(timer)
  timer = setTimeout(load, 250)
})
onMounted(load)
</script>

<template>
  <div class="flex w-full gap-1">
    <USelectMenu
      :model-value="model ?? undefined"
      v-model:search-term="search"
      :items="items"
      value-key="value"
      :loading="loading"
      :ignore-filter="app.publicProfiles"
      :placeholder="placeholder ?? 'Select a person'"
      class="flex-1"
      @update:model-value="(v: string) => (model = v)"
    />
    <UButton v-if="model && !required" icon="i-lucide-x" color="neutral" variant="ghost" aria-label="Clear" @click="model = null" />
  </div>
</template>
