<script setup lang="ts">
import { fieldOf, personName, type EntityMeta, type Profile, type Row } from '#core/utils/meta'

const props = defineProps<{ entity: EntityMeta, record: Row }>()

interface Entry { id: number, action: string, actor_id: string | null, changes: Record<string, unknown> | null, created_at: string }
const sb = useSupabase()
const entries = ref<Entry[]>([])
const people = ref<Record<string, Profile>>({})
const loading = ref(true)

async function load() {
  const { data } = await sb.from('audit_log')
    .select('id, action, actor_id, changes, created_at')
    .eq('org_id', props.record.org_id)
    .eq('table_name', props.entity.name)
    .eq('record_id', props.record.id)
    .order('created_at', { ascending: false })
    .limit(50)
  entries.value = (data ?? []) as Entry[]
  const ids = [...new Set(entries.value.map(e => e.actor_id).filter(Boolean))] as string[]
  if (ids.length) {
    const { data: profiles } = await sb.from('profiles').select('id, full_name, email').in('id', ids)
    people.value = Object.fromEntries((profiles ?? []).map(p => [p.id, p as Profile]))
  }
  loading.value = false
}

const changedLabels = (e: Entry) => Object.keys(e.changes ?? {})
  .map(k => fieldOf(props.entity, k)?.label)
  .filter(Boolean)
  .join(', ')

const describe = (e: Entry) => e.action === 'insert' ? 'created this record'
  : e.action === 'delete' ? 'deleted this record'
    : `updated ${changedLabels(e) || 'this record'}`

onMounted(load)
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-semibold text-highlighted">Activity</h3>
    </template>
    <USkeleton v-if="loading" class="h-6 w-full" />
    <p v-else-if="!entries.length" class="text-sm text-muted">No activity recorded.</p>
    <ol v-else class="space-y-3">
      <li v-for="e in entries" :key="e.id" class="flex gap-3 text-sm">
        <UAvatar :alt="personName(people[e.actor_id ?? ''])" size="2xs" class="mt-0.5" />
        <div class="min-w-0">
          <span class="font-medium text-highlighted">{{ personName(people[e.actor_id ?? '']) }}</span>
          <span class="text-muted"> {{ describe(e) }}</span>
          <div class="text-xs text-dimmed">{{ timeAgo(e.created_at) }}</div>
        </div>
      </li>
    </ol>
  </UCard>
</template>
