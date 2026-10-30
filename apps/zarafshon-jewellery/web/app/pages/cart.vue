<script setup lang="ts">
import { commerce } from '#core/schema'
import { entityByName } from '#core/utils/meta'

definePageMeta({ layout: 'site' })
useHead({ title: () => t('cart.title') })

if (!commerce) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const cart = useCart()
const toast = useToast()
const items = ref<CartItem[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    items.value = await cart.items()
  } catch (err) {
    toast.add({ title: t('form.couldNotLoad'), description: friendlyError(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)

function setQty(item: CartItem, qty: number | null | undefined) {
  cart.setQty(item.key, qty ?? 1)
  item.qty = qty ?? 1
}
function remove(item: CartItem) {
  cart.remove(item.key)
  items.value = items.value.filter(i => i.key !== item.key)
}

const subtotal = computed(() => items.value.reduce((n, i) => n + i.price * i.qty, 0))
const delivery = computed(() => cart.deliveryFee(items.value))
const overStock = computed(() => items.value.some(i => i.stock !== undefined && i.qty > i.stock))
const productSlug = commerce ? entityByName(commerce.product)?.slug : ''
const sellers = computed(() => new Set(items.value.map(i => i.seller).filter(Boolean)).size)
</script>

<template>
  <div class="site-section site-wrap">
    <h1 class="site-title site-h1 mb-6">{{ t('cart.title') }}</h1>
    <USkeleton v-if="loading" class="h-40 w-full" />
    <div v-else-if="!items.length" class="py-16 text-center">
      <UIcon name="i-lucide-shopping-cart" class="mx-auto size-10 text-dimmed" />
      <p class="mt-2 text-muted">{{ t('cart.empty') }}</p>
      <UButton :to="`/${productSlug}`" :label="t('cart.start')" class="mt-4" size="lg" />
    </div>
    <div v-else class="grid gap-8 lg:grid-cols-3">
      <ul class="rows lg:col-span-2">
        <li v-for="item in items" :key="item.key" class="flex flex-wrap items-center gap-4 border-b border-default py-4">
          <div class="size-20 shrink-0 overflow-hidden rounded-md bg-elevated">
            <img v-if="item.cover" :src="item.cover" :alt="item.title" class="size-full object-cover">
          </div>
          <div class="min-w-40 flex-1">
            <NuxtLink :to="`/${productSlug}/${item.id}`" class="font-medium text-highlighted hover:text-primary">{{ item.title }}</NuxtLink>
            <p v-if="item.variantName" class="text-sm text-muted">{{ item.variantName }}</p>
            <p class="text-sm text-muted tabular-nums">{{ formatMoney(item.price) }}</p>
            <p v-if="item.seller" class="text-xs text-dimmed">{{ item.seller }}</p>
            <p v-if="item.stock !== undefined && item.qty > item.stock" class="text-xs text-error">{{ t('shop.left', { n: item.stock }) }}</p>
          </div>
          <UInputNumber :model-value="item.qty" :min="1" :max="999" class="w-28" :aria-label="t('shop.quantity')" @update:model-value="v => setQty(item, v)" />
          <p class="w-32 text-right font-semibold tabular-nums">{{ formatMoney(item.price * item.qty) }}</p>
          <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" :aria-label="t('cart.remove')" @click="remove(item)" />
        </li>
      </ul>

      <aside class="h-fit rounded-lg bg-elevated p-5">
        <dl class="space-y-2">
          <div class="flex justify-between"><dt class="text-muted">{{ t('cart.subtotal') }}</dt><dd class="tabular-nums">{{ formatMoney(subtotal) }}</dd></div>
          <div class="flex justify-between">
            <dt class="text-muted">{{ t('cart.delivery') }}</dt>
            <dd class="tabular-nums">{{ delivery ? formatMoney(delivery) : t('cart.free') }}</dd>
          </div>
          <div class="flex justify-between border-t border-default pt-3 text-lg font-bold text-highlighted">
            <dt>{{ t('cart.total') }}</dt><dd class="tabular-nums">{{ formatMoney(subtotal + delivery) }}</dd>
          </div>
        </dl>
        <p v-if="sellers > 1" class="mt-3 text-sm text-muted">{{ t('cart.sellers', { n: sellers }) }}</p>
        <UButton to="/checkout" block size="lg" :label="t('cart.checkout')" class="mt-4" :disabled="overStock" />
      </aside>
    </div>
  </div>
</template>
