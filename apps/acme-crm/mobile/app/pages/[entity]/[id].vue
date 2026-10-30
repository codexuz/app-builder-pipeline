<script setup lang="ts">
import { commerce, scheduling } from '#core/schema'
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
const chosen = ref<string | undefined>()
const payment = usePayment()
const paying = ref(false)
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
    await notify.error(t('form.couldNotLoad'), err)
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

const options = computed(() => (record.value?.variants as Row[] | undefined)?.filter(v => v.active) ?? [])
const option = computed(() => options.value.find(v => v.id === chosen.value))
const price = computed(() => isProduct && record.value ? Number(option.value?.price ?? record.value[commerce!.price]) : undefined)
const stock = computed(() => isProduct && commerce?.stock && record.value ? Number(option.value ? option.value.stock : options.value.length ? 1 : record.value[commerce.stock]) : undefined)
const soldOut = computed(() => stock.value !== undefined && stock.value <= 0)
const needsOption = computed(() => options.value.length > 0 && !chosen.value)
const bookPath = computed(() => {
  if (!scheduling?.service) return undefined
  const booking = entityByName(scheduling.entity)!
  const f = booking.fields.find(x => x.name === scheduling!.service)
  return f?.to === entity.name ? `/${booking.slug}/new?${f.name}=${id}` : undefined
})
const hidden = new Set([entity.title, commerce?.price, commerce?.stock, commerce?.active])
const details = entity.fields.filter(f => !f.auto && f.type !== 'json' && !/_(uz|ru|en)$/.test(f.name) && (!isProduct || !hidden.has(f.name)) && (f.name !== entity.title || f.alias))
const children = entity.children
  .map(c => ({ ...c, meta: entityByName(c.entity)! }))
  .filter(c => c.entity !== 'shop_variant').filter(c => isPublicEntity(c.meta) || (entity.access === 'customer' && c.meta.access === 'customer'))
const images = computed(() => {
  const urls = media.value.map(m => m.url).filter(Boolean) as string[]
  const cover = record.value?.cover_url
  return cover ? [cover, ...urls.filter(u => u !== cover)] : urls
})

async function addToCart() {
  cart.add(id, qty.value, chosen.value)
  await notify.toast(t('shop.added', { name: title.value }), 'success', 1500)
}

async function pay() {
  paying.value = true
  try {
    await payment.start(id)
  } catch (err) {
    paying.value = false
    await notify.error(t('pay.failed'), err)
  }
}

async function cancelOrder() {
  if (!(await notify.confirm(t('order.cancelConfirm'), undefined, t('order.cancel'), true))) return
  const { error } = await useSupabase().rpc('cancel_order', { p_order: id })
  if (error) return notify.error(t('form.failed'), error)
  await notify.toast(t('order.cancelled'), 'success')
  await load()
}

async function remove() {
  if (!(await notify.confirm(t('form.deleteConfirm', { name: title.value }), t('form.cannotUndo'), t('form.delete'), true))) return
  try {
    await records.remove(id)
    router.navigate(`/${entity.slug}`, 'back', 'pop')
  } catch (err) {
    await notify.error(t('form.failed'), err)
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
        <p>{{ t('form.notFoundNote') }}</p>
      </div>
      <template v-else>
        <div v-if="images.length" class="gallery">
          <img v-for="url in images" :key="url" :src="url" :alt="title">
        </div>

        <div class="ion-padding">
          <h1 style="margin: 0; font-size: 22px">{{ title }}</h1>
          <p v-if="record.seller" class="muted" style="margin: 4px 0 0">{{ t('shop.soldBy', { name: record.seller.name }) }}</p>
          <p v-if="price !== undefined" class="stat-value" style="margin: 8px 0 0; font-size: 26px">{{ formatMoney(price) }}</p>
          <div v-if="options.length" class="ion-padding-top">
            <p class="muted" style="margin: 0 0 6px">{{ t('shop.chooseOption', { label: tl(commerce!.variantLabel) }) }}</p>
            <ion-chip v-for="v in options" :key="v.id" :color="chosen === v.id ? 'primary' : undefined" :outline="chosen !== v.id" :disabled="commerce?.stock ? v.stock <= 0 : false" @click="chosen = v.id">{{ v.name }}</ion-chip>
          </div>
          <ion-button v-if="bookPath" expand="block" class="ion-margin-top" :router-link="bookPath">{{ t('book.now') }}</ion-button>
          <div v-if="isProduct" class="qty-row">
            <ion-button fill="outline" :disabled="qty <= 1" :aria-label="t('cart.remove')" @click="qty--">−</ion-button>
            <span class="tabular" style="min-width: 28px; text-align: center">{{ qty }}</span>
            <ion-button fill="outline" :disabled="stock !== undefined && qty >= stock" :aria-label="t('form.add')" @click="qty++">+</ion-button>
            <ion-button style="flex: 1" :disabled="soldOut || needsOption" @click="addToCart">{{ soldOut ? t('shop.soldOut') : t('shop.add') }}</ion-button>
          </div>
        </div>

        <ion-list>
          <ion-item v-for="f in details.filter(d => hasValue(record?.[d.name]))" :key="f.name">
            <ion-label class="ion-text-wrap">
              <p>{{ tl(f.label) }}</p>
              <h3><FieldValue :field="f" :row="record" /></h3>
            </ion-label>
          </ion-item>
        </ion-list>

        <div v-if="entity.name === 'shop_order' && payment.isOnline(record.payment_method) && record.payment_status === 'unpaid' && record.status !== 'cancelled'" class="ion-padding">
          <ion-button expand="block" :disabled="paying" @click="pay">{{ t('pay.now') }}</ion-button>
        </div>
        <div v-if="entity.name === 'shop_order' && record.status === 'new'" class="ion-padding">
          <ion-button expand="block" fill="outline" color="danger" @click="cancelOrder">{{ t('order.cancel') }}</ion-button>
        </div>
        <div v-if="canAsCustomer(entity, 'delete', record)" class="ion-padding">
          <ion-button expand="block" fill="clear" color="danger" @click="remove">{{ t('form.delete') }}</ion-button>
        </div>

        <section v-for="c in children" :key="`${c.entity}.${c.field}`">
          <ion-list-header>
            <ion-label>{{ tl(c.meta.plural) }}</ion-label>
            <ion-button v-if="isSubmittable(c.meta)" :router-link="`/${c.meta.slug}/new?${c.field}=${id}`">{{ t('form.add') }}</ion-button>
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
