<script setup lang="ts">
import { entityByName, personName, recordTitle, type Row } from '#core/utils/meta'

const entity = useEntityRoute()
const id = String(useRouter().currentRoute.value.params.id)
const router = useIonRouter()
const notify = useNotify()
const { can } = usePermissions()
const { current } = useWorkspace()
const records = useRecords(entity)

const record = ref<Row | null>(null)
const loading = ref(true)
const lists = new Map<string, { reload: () => Promise<void> | void }>()

async function load() {
  try {
    record.value = await records.get(id)
  } catch (err) {
    await notify.error('Could not load record', err)
  } finally {
    loading.value = false
  }
}
onMounted(load)
// Coming back from the edit page or a child record.
onIonViewWillEnter(() => {
  if (loading.value) return
  load()
  lists.forEach(l => l.reload())
})

const title = computed(() => record.value ? recordTitle(entity, record.value) : entity.label)
const details = computed(() => entity.fields.filter(f => f.name !== entity.title || f.alias))
const children = entity.children.map(c => ({ ...c, meta: entityByName(c.entity)! })).filter(c => c.meta)
const inWorkspace = computed(() => record.value?.org_id === current.value?.id)
// @nuxtjs/ionic's useHead does not unwrap refs, so pass plain values and patch on change.
const head = useHead({ title: title.value })
watch(title, t => head.patch({ title: t }))

async function remove() {
  if (!(await notify.confirm(`Delete ${title.value}?`, 'This cannot be undone.', 'Delete', true))) return
  try {
    await records.remove(id)
    await notify.toast(`${entity.label} deleted`, 'success')
    router.navigate(`/app/${entity.slug}`, 'back', 'pop')
  } catch (err) {
    await notify.error('Could not delete', err)
  }
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/app/${entity.slug}`" />
        </ion-buttons>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons v-if="record" slot="end">
          <ion-button v-if="can(entity, 'update', record)" :router-link="`/app/${entity.slug}/${id}/edit`" aria-label="Edit">
            <Icon name="i-lucide-pencil" />
          </ion-button>
          <ion-button v-if="can(entity, 'delete', record)" color="danger" aria-label="Delete" @click="remove">
            <Icon name="i-lucide-trash-2" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-progress-bar v-if="loading" type="indeterminate" />
      <div v-else-if="!record" class="empty-state">
        <Icon name="i-lucide-search-x" />
        <p>Record not found. It may have been deleted, or you do not have access.</p>
      </div>
      <template v-else>
        <ion-list>
          <ion-item v-for="f in details" :key="f.name">
            <ion-label class="ion-text-wrap">
              <p>{{ f.label }}</p>
              <h3><FieldValue :field="f" :row="record" /></h3>
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-note>
              Created {{ timeAgo(record.created_at) }} by {{ personName(record.creator) }}
            </ion-note>
          </ion-item>
        </ion-list>

        <section v-for="c in children" :key="`${c.entity}.${c.field}`">
          <ion-list-header>
            <ion-label>{{ c.meta.plural }}</ion-label>
            <ion-button
              v-if="can(c.meta, 'create') && (inWorkspace || entity.access === 'members')"
              :router-link="`/app/${c.meta.slug}/new?${c.field}=${id}`"
            >
              Add
            </ion-button>
          </ion-list-header>
          <RecordList :ref="el => { if (el) lists.set(`${c.entity}.${c.field}`, el as any) }" :entity="c.meta" :where="{ [c.field]: id }" :scope="c.meta.access === 'members' ? 'all' : 'workspace'" :page-size="10" :infinite="false" />
        </section>

        <RecordFiles v-if="entity.attachments" :entity="entity" :record="record" :editable="can(entity, 'update', record)" />
      </template>
    </ion-content>
  </ion-page>
</template>
