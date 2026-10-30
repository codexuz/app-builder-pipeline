<script setup lang="ts">
import type { RefresherCustomEvent } from '@ionic/vue'
import { app, dashboard } from '#core/schema'
import { entityByName, fieldOf, navEntities } from '#core/utils/meta'

const { current } = useWorkspace()
const { user } = useAuth()
const notify = useNotify()
const stats = ref<Record<string, any> | null>(null)
const recentList = ref<{ reload: () => Promise<void> | void }>()

async function load() {
  if (!current.value) return
  const { data, error } = await useSupabase().rpc('dashboard_stats', { p_org: current.value.id })
  if (error) await notify.error('Could not load the dashboard', error)
  else stats.value = data as Record<string, any>
}
watch(() => current.value?.id, load, { immediate: true })
onIonViewWillEnter(() => { if (stats.value) { load(); recentList.value?.reload() } })

async function refresh(ev: RefresherCustomEvent) {
  await Promise.all([load(), recentList.value?.reload()])
  await ev.target.complete()
}

type Card = (typeof dashboard)[number]
const cards = dashboard.map((c, i) => ({ c, i, e: entityByName(c.entity)! }))
const tiles = cards.filter(t => t.c.type !== 'breakdown')
const breakdowns = cards.filter(t => t.c.type === 'breakdown')
const recent = navEntities()[0]

function tileValue(c: Card, i: number) {
  const v = Number(stats.value?.[`c${i}`] ?? 0)
  if (c.type === 'sum' && fieldOf(entityByName(c.entity)!, c.field)?.type === 'money') return formatMoney(v)
  return formatNumber(v)
}

function breakdownRows(c: Card, i: number) {
  if (c.type !== 'breakdown') return []
  const counts = (stats.value?.[`c${i}`] ?? {}) as Record<string, number>
  const f = fieldOf(entityByName(c.entity)!, c.field)!
  const keys = f.type === 'boolean' ? ['true', 'false'] : f.options ?? []
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return keys.map(k => ({
    key: k,
    label: f.type === 'boolean' ? (k === 'true' ? 'Yes' : 'No') : humanize(k),
    count: counts[k] ?? 0,
    ratio: total ? (counts[k] ?? 0) / total : 0
  }))
}

const firstName = computed(() => user.value?.user_metadata?.full_name?.split(' ')[0])
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>{{ current?.personal ? app.name : current?.name }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="ion-padding-horizontal ion-padding-top">
        <h1 style="margin: 0; font-size: 22px">Hi{{ firstName ? `, ${firstName}` : '' }}</h1>
        <p class="muted" style="margin-top: 4px">{{ app.description }}</p>
      </div>

      <div class="stat-grid">
        <ion-card v-for="{ c, i, e } in tiles" :key="i" class="stat-card" button :router-link="`/app/${e.slug}`">
          <ion-card-header>
            <ion-card-subtitle>{{ c.label ?? e.plural }}</ion-card-subtitle>
            <div class="stat-value">
              <ion-skeleton-text v-if="!stats" animated style="width: 60%; height: 22px" />
              <template v-else>{{ tileValue(c, i) }}</template>
            </div>
          </ion-card-header>
        </ion-card>
      </div>

      <ion-card v-for="{ c, i, e } in breakdowns" :key="i">
        <ion-card-header>
          <ion-card-title style="font-size: 16px">{{ c.label ?? `${e.plural} by ${fieldOf(e, (c as any).field)?.label.toLowerCase()}` }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div v-for="r in breakdownRows(c, i)" :key="r.key" style="margin-bottom: 10px">
            <div style="display: flex; justify-content: space-between; font-size: 14px">
              <span>{{ r.label }}</span>
              <span class="muted tabular">{{ r.count }}</span>
            </div>
            <ion-progress-bar :value="r.ratio" />
          </div>
        </ion-card-content>
      </ion-card>

      <template v-if="recent">
        <ion-list-header>
          <ion-label>Recent {{ recent.plural.toLowerCase() }}</ion-label>
          <ion-button :router-link="`/app/${recent.slug}`">See all</ion-button>
        </ion-list-header>
        <RecordList ref="recentList" :entity="recent" :scope="recent.access === 'members' ? 'all' : 'workspace'" :page-size="5" :infinite="false" />
      </template>
    </ion-content>
  </ion-page>
</template>
