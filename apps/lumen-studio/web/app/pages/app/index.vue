<script setup lang="ts">
import { app, dashboard } from '#core/schema'
import { entityByName, fieldOf, navEntities } from '#core/utils/meta'

const { current } = useWorkspace()
const { user } = useAuth()
const stats = ref<Record<string, any> | null>(null)
const error = ref('')

async function load() {
  if (!current.value) return
  const { data, error: err } = await useSupabase().rpc('dashboard_stats', { p_org: current.value.id })
  if (err) error.value = friendlyError(err)
  else stats.value = data as Record<string, any>
}
watch(() => current.value?.id, load, { immediate: true })

const tiles = computed(() => dashboard.map((c, i) => ({ c, i, e: entityByName(c.entity)! })).filter(t => t.c.type !== 'breakdown'))
const breakdowns = computed(() => dashboard.map((c, i) => ({ c, i, e: entityByName(c.entity)! })).filter(t => t.c.type === 'breakdown'))
const recent = navEntities()[0]

function tileValue(c: (typeof dashboard)[number], i: number) {
  const v = Number(stats.value?.[`c${i}`] ?? 0)
  if (c.type === 'sum' && fieldOf(entityByName(c.entity)!, c.field)?.type === 'money') return formatMoney(v)
  return formatNumber(v)
}
const tileLabel = (c: (typeof dashboard)[number]) => tl(c.label ?? entityByName(c.entity)!.plural)

function breakdownRows(c: (typeof dashboard)[number], i: number) {
  if (c.type !== 'breakdown') return []
  const counts = (stats.value?.[`c${i}`] ?? {}) as Record<string, number>
  const f = fieldOf(entityByName(c.entity)!, c.field)!
  const keys = f.type === 'boolean' ? ['true', 'false'] : f.options ?? []
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return keys.map(k => ({
    key: k,
    label: f.type === 'boolean' ? (k === 'true' ? 'Yes' : 'No') : humanize(k),
    count: counts[k] ?? 0,
    pct: total ? Math.round(((counts[k] ?? 0) / total) * 100) : 0,
    color: f.type === 'enum' ? optionColor(f, k) : 'primary'
  }))
}

const greeting = computed(() => {
  const h = new Date().getHours()
  const name = user.value?.user_metadata?.full_name?.split(' ')[0]
  return `${h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'}${name ? `, ${name}` : ''}`
})
useHead({ title: 'Dashboard' })
</script>

<template>
  <UDashboardPanel id="dashboard">
    <template #header>
      <UDashboardNavbar title="Dashboard" icon="i-lucide-layout-dashboard">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div>
        <h1 class="text-xl font-semibold text-highlighted">{{ greeting }}</h1>
        <p class="text-sm text-muted">{{ current?.personal ? app.description : current?.name }}</p>
      </div>

      <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" title="Could not load the dashboard" :description="error" />

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ULink v-for="{ c, i, e } in tiles" :key="i" :to="`/app/${e.slug}`" class="group">
          <UCard class="h-full transition-colors group-hover:ring-primary/50">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm text-muted">{{ tileLabel(c) }}</p>
                <USkeleton v-if="!stats" class="mt-2 h-7 w-20" />
                <p v-else class="mt-1 text-2xl font-semibold text-highlighted tabular-nums">{{ tileValue(c, i) }}</p>
              </div>
              <div class="rounded-md bg-primary/10 p-2 text-primary">
                <UIcon :name="(c.type !== 'breakdown' && c.icon) || e.icon" class="size-5" />
              </div>
            </div>
          </UCard>
        </ULink>
      </div>

      <div v-if="breakdowns.length" class="grid gap-4 lg:grid-cols-2">
        <UCard v-for="{ c, i, e } in breakdowns" :key="i">
          <template #header>
            <h2 class="font-semibold text-highlighted">{{ c.label ?? `${e.plural} by ${fieldOf(e, (c as any).field)?.label.toLowerCase()}` }}</h2>
          </template>
          <ul class="space-y-3">
            <li v-for="r in breakdownRows(c, i)" :key="r.key">
              <div class="mb-1 flex justify-between text-sm">
                <span>{{ r.label }}</span>
                <span class="text-muted tabular-nums">{{ r.count }}</span>
              </div>
              <UProgress :model-value="r.pct" :color="r.color" size="sm" />
            </li>
          </ul>
        </UCard>
      </div>

      <section v-if="recent" class="space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-highlighted">Recent {{ recent.plural.toLowerCase() }}</h2>
          <UButton :to="`/app/${recent.slug}`" label="View all" trailing-icon="i-lucide-arrow-right" color="neutral" variant="ghost" size="sm" />
        </div>
        <EntityTable :entity="recent" :page-size="5" compact />
      </section>
    </template>
  </UDashboardPanel>
</template>
