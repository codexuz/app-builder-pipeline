<script setup lang="ts">
import { commerce } from '#core/schema'
import { entityByName, isPublicEntity, isSubmittable, recordTitle, type Row } from '#core/utils/meta'

const entity = useEntityRoute()
const id = String(useRouter().currentRoute.value.params.id)
const router = useIonRouter()
const notify = useNotify()
const cart = useCart()
const { canAsCustomer } = usePermissions()
const records = useRecords(entity)

const record = ref<Row | null>(null)
const loading = ref(true)
const media = ref<MediaFile[]>([])
const qty = ref(1)
const isPublic = isPublicEntity(entity)
const isProduct = entity.name === commerce?.product
const lists = new Map<string, { reload: () => Promise<void> | void }>()

async function load() {
  try {
    record.value = await records.get(id)
    if (record.value && entity.attachments && entity.access === 'public') {
      media.value = await useMedia(entity, record.value).list().catch(() => [])
    }
  } catch (err) {
    await notify.error('Could not load this page', err)
  } finally {
    loading.value = false
  }
}
onMounted(load)
onIonViewWillEnter(() => {
  if (loading.value) return
  load()
  lists.forEach(l => l.reload())
})

const title = computed(() => record.value ? recordTitle(entity, record.value) : entity.label)
const head = useHead({ title: title.value })
watch(title, t => head.patch({ title: t }))

const price = computed(() => isProduct && record.value ? Number(record.value[commerce!.price]) : undefined)
const stock = computed(() => isProduct && commerce?.stock && record.value ? Number(record.value[commerce.stock]) : undefined)
const soldOut = computed(() => stock.value !== undefined && stock.value <= 0)
const hidden = new Set([entity.title, commerce?.price, commerce?.stock, commerce?.active])
const details = entity.fields.filter(f => !f.auto && f.type !== 'json' && (!isProduct || !hidden.has(f.name)) && (f.name !== entity.title || f.alias))
const children = entity.children
  .map(c => ({ ...c, meta: entityByName(c.entity)! }))
  .filter(c => isPublicEntity(c.meta) || (entity.access === 'customer' && c.meta.access === 'customer'))
const images = computed(() => {
  const urls = media.value.map(m => m.url).filter(Boolean) as string[]
  const cover = record.value?.cover_url
  return cover ? [cover, ...urls.filter(u => u !== cover)] : urls
})

async function addToCart() {
  cart.add(id, qty.value)
  await notify.toast(`${title.value} added to cart`, 'success', 1500)
}

async function cancelOrder() {
  if (!(await notify.confirm('Cancel this order?', undefined, 'Cancel order', true))) return
  const { error } = await useSupabase().rpc('cancel_order', { p_order: id })
  if (error) return notify.error('Could not cancel', error)
  await notify.toast('Order cancelled', 'success')
  await load()
}

async function remove() {
  if (!(await notify.confirm(`Delete ${title.value}?`, undefined, 'Delete', true))) return
  try {
    await records.remove(id)
    router.navigate(`/${entity.slug}`, 'back', 'pop')
  } catch (err) {
    await notify.error('Could not delete', err)
  }
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/${entity.slug}`" /></ion-buttons>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end"><CartButton /></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-progress-bar v-if="loading" type="indeterminate" />
      <div v-else-if="!record" class="empty-state">
        <Icon name="i-lucide-search-x" />
        <p>Not found. It may have been removed, or you may need to sign in.</p>
      </div>
      <template v-else>
        <div v-if="images.length" class="gallery">
          <img v-for="url in images" :key="url" :src="url" :alt="title">
        </div>

        <div class="ion-padding">
          <h1 style="margin: 0; font-size: 22px">{{ title }}</h1>
          <p v-if="record.seller" class="muted" style="margin: 4px 0 0">Sold by {{ record.seller.name }}</p>
          <p v-if="price !== undefined" class="stat-value" style="margin: 8px 0 0; font-size: 26px">{{ formatMoney(price) }}</p>
          <div v-if="isProduct" class="qty-row">
            <ion-button fill="outline" :disabled="qty <= 1" aria-label="Fewer" @click="qty--">−</ion-button>
            <span class="tabular" style="min-width: 28px; text-align: center">{{ qty }}</span>
            <ion-button fill="outline" :disabled="stock !== undefined && qty >= stock" aria-label="More" @click="qty++">+</ion-button>
            <ion-button style="flex: 1" :disabled="soldOut" @click="addToCart">{{ soldOut ? 'Sold out' : 'Add to cart' }}</ion-button>
          </div>
        </div>

        <ion-list>
          <ion-item v-for="f in details.filter(d => hasValue(record?.[d.name]))" :key="f.name">
            <ion-label class="ion-text-wrap">
              <p>{{ f.label }}</p>
              <h3><FieldValue :field="f" :row="record" /></h3>
            </ion-label>
          </ion-item>
        </ion-list>

        <div v-if="entity.name === 'shop_order' && record.status === 'new'" class="ion-padding">
          <ion-button expand="block" fill="outline" color="danger" @click="cancelOrder">Cancel order</ion-button>
        </div>
        <div v-if="canAsCustomer(entity, 'delete', record)" class="ion-padding">
          <ion-button expand="block" fill="clear" color="danger" @click="remove">Delete</ion-button>
        </div>

        <section v-for="c in children" :key="`${c.entity}.${c.field}`">
          <ion-list-header>
            <ion-label>{{ c.meta.plural }}</ion-label>
            <ion-button v-if="isSubmittable(c.meta)" :router-link="`/${c.meta.slug}/new?${c.field}=${id}`">Add</ion-button>
          </ion-list-header>
          <RecordList
            :ref="el => { if (el) lists.set(`${c.entity}.${c.field}`, el as any) }"
            :entity="c.meta"
            :where="{ [c.field]: id }"
            :scope="isPublic ? 'all' : 'mine'"
            :page-size="20"
            :infinite="false"
            :link-to="() => `/${entity.slug}/${id}`"
          />
        </section>
      </template>
    </ion-content>
  </ion-page>
</template>
