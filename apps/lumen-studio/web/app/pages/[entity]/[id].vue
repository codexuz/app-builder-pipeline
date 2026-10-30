<script setup lang="ts">
import { app, commerce, scheduling } from '#core/schema'
import { entityByName, isPublicEntity, isSubmittable, recordTitle, type Row } from '#core/utils/meta'

definePageMeta({ layout: 'site' })

const entity = useEntityRoute()
if (!isPublicEntity(entity) && entity.access !== 'customer') {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const id = String(useRoute().params.id)
const records = useRecords(entity)
const cart = useCart()
const toast = useToast()
const confirm = useConfirm()
const payment = usePayment()
const { canAsCustomer } = usePermissions()

// Public records render on the server; a customer's own records need the session in the browser.
const isPublic = isPublicEntity(entity)
const { data: record, error, refresh } = await useAsyncData(`record:${entity.name}:${id}`, () => records.get(id), { server: isPublic })
if (import.meta.server && isPublic && !error.value && !record.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const title = computed(() => record.value ? recordTitle(entity, record.value) : tl(entity.label))
const isProduct = entity.name === commerce?.product
const options = computed(() => (record.value?.variants as Row[] | undefined)?.filter(v => v.active) ?? [])
const chosen = ref<string | undefined>()
const option = computed(() => options.value.find(v => v.id === chosen.value))
const price = computed(() => {
  if (!isProduct || !record.value) return undefined
  return Number(option.value?.price ?? record.value[commerce!.price])
})
const stock = computed(() => {
  if (!isProduct || !commerce?.stock || !record.value) return undefined
  return Number(option.value ? option.value.stock : options.value.length ? 1 : record.value[commerce.stock])
})
const soldOut = computed(() => stock.value !== undefined && stock.value <= 0)
const needsOption = computed(() => options.value.length > 0 && !chosen.value)
const hidden = new Set([entity.title, commerce?.price, commerce?.stock, commerce?.active])
const details = entity.fields.filter(f => !f.auto && !/_(uz|ru|en)$/.test(f.name) && (!hidden.has(f.name) || !isProduct) && (f.name !== entity.title || f.alias) && f.type !== 'json')
const qty = ref(1)

const children = entity.children
  .map(c => ({ ...c, meta: entityByName(c.entity)! }))
  .filter(c => c.meta && c.entity !== 'shop_variant' && (isPublicEntity(c.meta) || (entity.access === 'customer' && c.meta.access === 'customer')))

const media = ref<MediaFile[]>([])
const activeImage = ref<string | null>(null)
onMounted(async () => {
  if (!record.value || !entity.attachments || !isPublic) return
  media.value = await useMedia(entity, record.value).list().catch(() => [])
})
const shownImage = computed(() => activeImage.value ?? record.value?.cover_url ?? media.value[0]?.url)

// A service page leads to booking it.
const bookLink = computed(() => {
  if (!scheduling?.service) return undefined
  const booking = entityByName(scheduling.entity)!
  const f = booking.fields.find(x => x.name === scheduling!.service)
  return f?.to === entity.name ? { path: `/${booking.slug}/new`, query: { [f.name]: id } } : undefined
})

function addToCart() {
  cart.add(id, qty.value, chosen.value)
  toast.add({ title: t('shop.added', { name: title.value }), color: 'success', icon: 'i-lucide-check', actions: [{ label: t('cart.viewCart'), to: '/cart' }] })
}

async function cancelOrder() {
  if (!(await confirm({ title: t('order.cancelConfirm'), confirmLabel: t('order.cancel'), danger: true }))) return
  const { error: err } = await useSupabase().rpc('cancel_order', { p_order: id })
  if (err) return toast.add({ title: t('form.failed'), description: friendlyError(err), color: 'error' })
  toast.add({ title: t('order.cancelled'), color: 'success' })
  refresh()
}

const paying = ref(false)
async function pay() {
  paying.value = true
  try {
    await payment.start(id)
  } catch (err) {
    paying.value = false
    toast.add({ title: t('pay.failed'), description: friendlyError(err), color: 'error' })
  }
}

async function remove() {
  if (!(await confirm({ title: t('form.deleteConfirm', { name: title.value }), description: t('form.cannotUndo'), confirmLabel: t('form.delete'), danger: true }))) return
  try {
    await records.remove(id)
    await navigateTo(`/${entity.slug}`, { replace: true })
  } catch (err) {
    toast.add({ title: t('form.failed'), description: friendlyError(err, entity), color: 'error' })
  }
}

useSeoMeta({
  title,
  description: () => (record.value?.description as string | undefined) ?? app.description,
  ogTitle: title,
  ogImage: () => record.value?.cover_url ?? undefined
})
// Structured data lets search engines show price and availability.
if (isProduct && record.value) {
  useHead({
    script: [{
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': title.value,
        'image': record.value.cover_url ?? undefined,
        'offers': {
          '@type': 'Offer',
          'price': price.value,
          'priceCurrency': app.currency,
          'availability': `https://schema.org/${soldOut.value ? 'OutOfStock' : 'InStock'}`
        }
      })
    }]
  })
}
</script>

<template>
  <div class="site-section site-wrap">
    <UAlert
      v-if="!record"
      color="neutral"
      variant="subtle"
      icon="i-lucide-search-x"
      :title="t('form.notFound')"
      :description="t('form.notFoundNote')"
      :actions="[{ label: t('form.back'), to: `/${entity.slug}` }]"
    />
    <div v-else class="space-y-10">
      <div class="grid gap-8" :class="entity.attachments && isPublic ? 'lg:grid-cols-2' : ''">
        <div v-if="entity.attachments && isPublic" class="space-y-3">
          <div class="rec__media">
            <img v-if="shownImage" :src="shownImage" :alt="title">
            <span v-else class="rec__blank"><UIcon :name="entity.icon" class="size-14" /></span>
          </div>
          <div v-if="media.length > 1" class="flex gap-2 overflow-x-auto">
            <button v-for="f in media" :key="f.name" type="button" class="size-16 shrink-0 overflow-hidden rounded-md ring-1 ring-default" :aria-label="f.name" @click="activeImage = f.url ?? null">
              <img :src="f.url" alt="" class="size-full object-cover" loading="lazy">
            </button>
          </div>
        </div>

        <div class="space-y-5">
          <div>
            <h1 class="site-title site-h1">{{ title }}</h1>
            <p v-if="record.seller" class="mt-1 text-sm text-muted">{{ t('shop.soldBy', { name: record.seller.name }) }}</p>
            <p v-if="price !== undefined" class="rec__price mt-3 !text-3xl">{{ formatMoney(price) }}</p>
          </div>

          <div v-if="isProduct && options.length" class="space-y-2">
            <p class="text-sm font-medium text-highlighted">{{ t('shop.chooseOption', { label: tl(commerce!.variantLabel) }) }}</p>
            <div class="flex flex-wrap gap-2">
              <button v-for="v in options" :key="v.id" type="button" class="chip" :aria-pressed="chosen === v.id" :disabled="commerce?.stock ? v.stock <= 0 : false" @click="chosen = v.id">{{ v.name }}</button>
            </div>
          </div>

          <div v-if="isProduct" class="flex flex-wrap items-center gap-3">
            <UInputNumber v-model="qty" :min="1" :max="stock && stock > 0 ? stock : 999" class="w-32" :aria-label="t('shop.quantity')" />
            <UButton size="lg" :disabled="soldOut || needsOption" :label="soldOut ? t('shop.soldOut') : t('shop.add')" @click="addToCart" />
          </div>
          <p v-if="isProduct && stock !== undefined && stock > 0 && stock <= 5 && !needsOption" class="text-sm text-warning">{{ t('shop.left', { n: stock }) }}</p>
          <UButton v-if="bookLink" size="lg" :to="bookLink" :label="t('book.now')" trailing-icon="i-lucide-arrow-right" />

          <dl class="grid gap-4 sm:grid-cols-2">
            <template v-for="f in details" :key="f.name">
              <div v-if="hasValue(record[f.name])" :class="['longtext', 'tags'].includes(f.type) ? 'sm:col-span-2' : ''">
                <dt class="text-xs font-medium text-muted">{{ tl(f.label) }}</dt>
                <dd class="mt-1 text-default"><EntityValue :field="f" :row="record" site /></dd>
              </div>
            </template>
          </dl>

          <div class="flex flex-wrap gap-2">
            <UButton v-if="entity.name === 'shop_order' && payment.isOnline(record.payment_method) && record.payment_status === 'unpaid' && record.status !== 'cancelled'" size="lg" :label="t('pay.now')" :loading="paying" @click="pay" />
            <UButton v-if="entity.name === 'shop_order' && record.status === 'new'" :label="t('order.cancel')" color="error" variant="outline" @click="cancelOrder" />
            <UButton v-if="canAsCustomer(entity, 'delete', record)" :label="t('form.delete')" color="error" variant="ghost" icon="i-lucide-trash-2" @click="remove" />
          </div>
        </div>
      </div>

      <section v-for="c in children" :key="`${c.entity}.${c.field}`" class="space-y-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="site-title site-h2">{{ tl(c.meta.plural) }}</h2>
          <UButton v-if="isSubmittable(c.meta)" :to="{ path: `/${c.meta.slug}/new`, query: { [c.field]: id } }" :label="t('form.add')" icon="i-lucide-plus" color="neutral" variant="outline" size="sm" />
        </div>
        <SiteChildList :entity="c.meta" :where="{ [c.field]: id }" />
      </section>
    </div>
  </div>
</template>
