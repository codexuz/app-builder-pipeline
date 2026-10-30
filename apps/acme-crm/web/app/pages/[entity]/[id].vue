<script setup lang="ts">
import { app, commerce } from '#core/schema'
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
const { canAsCustomer } = usePermissions()

// Public records render on the server; a customer's own records need the session in the browser.
const isPublic = isPublicEntity(entity)
const { data: record, error, refresh } = await useAsyncData(`record:${entity.name}:${id}`, () => records.get(id), { server: isPublic })
if (import.meta.server && isPublic && !error.value && !record.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const title = computed(() => record.value ? recordTitle(entity, record.value) : entity.label)
const isProduct = entity.name === commerce?.product
const price = computed(() => isProduct && record.value ? Number(record.value[commerce!.price]) : undefined)
const stock = computed(() => isProduct && commerce?.stock && record.value ? Number(record.value[commerce.stock]) : undefined)
const soldOut = computed(() => stock.value !== undefined && stock.value <= 0)
const hidden = new Set([entity.title, commerce?.price, commerce?.stock, commerce?.active])
const details = entity.fields.filter(f => !f.auto && (!hidden.has(f.name) || !isProduct) && (f.name !== entity.title || f.alias) && f.type !== 'json')
const qty = ref(1)

const children = entity.children
  .map(c => ({ ...c, meta: entityByName(c.entity)! }))
  .filter(c => isPublicEntity(c.meta) || (entity.access === 'customer' && c.meta.access === 'customer'))

const media = ref<MediaFile[]>([])
const activeImage = ref<string | null>(null)
onMounted(async () => {
  if (!record.value || !entity.attachments || !isPublic) return
  media.value = await useMedia(entity, record.value).list().catch(() => [])
})
const shownImage = computed(() => activeImage.value ?? record.value?.cover_url ?? media.value[0]?.url)

function addToCart() {
  cart.add(id, qty.value)
  toast.add({ title: `${title.value} added to cart`, color: 'success', icon: 'i-lucide-check', actions: [{ label: 'View cart', to: '/cart' }] })
}

async function cancelOrder() {
  const ok = await confirm({ title: 'Cancel this order?', confirmLabel: 'Cancel order', danger: true })
  if (!ok) return
  const { error: err } = await useSupabase().rpc('cancel_order', { p_order: id })
  if (err) return toast.add({ title: 'Could not cancel', description: friendlyError(err), color: 'error' })
  toast.add({ title: 'Order cancelled', color: 'success' })
  refresh()
}

async function remove() {
  if (!(await confirm({ title: `Delete ${title.value}?`, confirmLabel: 'Delete', danger: true }))) return
  try {
    await records.remove(id)
    await navigateTo(`/${entity.slug}`, { replace: true })
  } catch (err) {
    toast.add({ title: 'Could not delete', description: friendlyError(err, entity), color: 'error' })
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
  <UContainer class="py-8">
    <UAlert
      v-if="!record"
      color="neutral"
      variant="subtle"
      icon="i-lucide-search-x"
      title="Not found"
      description="It may have been removed, or you may need to sign in."
      :actions="[{ label: 'Back', to: `/${entity.slug}` }]"
    />
    <div v-else class="space-y-10">
      <div class="grid gap-8" :class="entity.attachments && isPublic ? 'lg:grid-cols-2' : ''">
        <div v-if="entity.attachments && isPublic" class="space-y-3">
          <div class="aspect-square overflow-hidden rounded-lg bg-elevated">
            <img v-if="shownImage" :src="shownImage" :alt="title" class="size-full object-cover">
            <div v-else class="flex size-full items-center justify-center"><UIcon :name="entity.icon" class="size-14 text-dimmed" /></div>
          </div>
          <div v-if="media.length > 1" class="flex gap-2 overflow-x-auto">
            <button v-for="f in media" :key="f.name" type="button" class="size-16 shrink-0 overflow-hidden rounded-md ring-1 ring-default" :aria-label="`Show ${f.name}`" @click="activeImage = f.url ?? null">
              <img :src="f.url" alt="" class="size-full object-cover" loading="lazy">
            </button>
          </div>
        </div>

        <div class="space-y-5">
          <div>
            <h1 class="text-2xl font-semibold text-highlighted">{{ title }}</h1>
            <p v-if="record.seller" class="mt-1 text-sm text-muted">Sold by {{ record.seller.name }}</p>
            <p v-if="price !== undefined" class="mt-3 text-3xl font-semibold text-highlighted tabular-nums">{{ formatMoney(price) }}</p>
          </div>

          <div v-if="isProduct" class="flex flex-wrap items-center gap-3">
            <UInputNumber v-model="qty" :min="1" :max="stock && stock > 0 ? stock : 999" class="w-32" aria-label="Quantity" />
            <UButton size="lg" :disabled="soldOut" :label="soldOut ? 'Sold out' : 'Add to cart'" :icon="soldOut ? undefined : 'i-lucide-shopping-cart'" @click="addToCart" />
          </div>

          <dl class="grid gap-4 sm:grid-cols-2">
            <div v-for="f in details.filter(d => hasValue(record?.[d.name]))" :key="f.name" :class="['longtext', 'tags'].includes(f.type) ? 'sm:col-span-2' : ''">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted">{{ f.label }}</dt>
              <dd class="mt-1 text-sm text-default"><EntityValue :field="f" :row="record" site /></dd>
            </div>
          </dl>

          <div class="flex flex-wrap gap-2">
            <UButton v-if="entity.name === 'shop_order' && record.status === 'new'" label="Cancel order" color="error" variant="outline" @click="cancelOrder" />
            <UButton v-if="canAsCustomer(entity, 'delete', record)" label="Delete" color="error" variant="ghost" icon="i-lucide-trash-2" @click="remove" />
          </div>
        </div>
      </div>

      <section v-for="c in children" :key="`${c.entity}.${c.field}`" class="space-y-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-lg font-semibold text-highlighted">{{ c.meta.plural }}</h2>
          <UButton v-if="isSubmittable(c.meta)" :to="{ path: `/${c.meta.slug}/new`, query: { [c.field]: id } }" :label="`Add ${c.meta.label.toLowerCase()}`" icon="i-lucide-plus" color="neutral" variant="outline" size="sm" />
        </div>
        <SiteChildList :entity="c.meta" :where="{ [c.field]: id }" />
      </section>
    </div>
  </UContainer>
</template>
