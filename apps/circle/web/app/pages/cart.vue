<script setup lang="ts">
import { commerce } from '#core/schema'
import { entityByName } from '#core/utils/meta'

definePageMeta({ layout: 'site' })
useHead({ title: 'Your cart' })

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
    toast.add({ title: 'Could not load your cart', description: friendlyError(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
onMounted(load)

function setQty(item: CartItem, qty: number | null | undefined) {
  cart.setQty(item.id, qty ?? 1)
  item.qty = qty ?? 1
}
function remove(item: CartItem) {
  cart.remove(item.id)
  items.value = items.value.filter(i => i.id !== item.id)
}

const subtotal = computed(() => items.value.reduce((n, i) => n + i.price * i.qty, 0))
const delivery = computed(() => cart.deliveryFee(items.value))
const overStock = computed(() => items.value.some(i => i.stock !== undefined && i.qty > i.stock))
const productSlug = commerce ? entityByName(commerce.product)?.slug : ''
const sellers = computed(() => new Set(items.value.map(i => i.seller).filter(Boolean)).size)
</script>

<template>
  <UContainer class="py-8">
    <h1 class="mb-6 text-2xl font-semibold text-highlighted">Your cart</h1>
    <USkeleton v-if="loading" class="h-40 w-full" />
    <div v-else-if="!items.length" class="py-16 text-center">
      <UIcon name="i-lucide-shopping-cart" class="mx-auto size-10 text-dimmed" />
      <p class="mt-2 text-muted">Your cart is empty.</p>
      <UButton :to="`/${productSlug}`" label="Start shopping" class="mt-4" />
    </div>
    <div v-else class="grid gap-8 lg:grid-cols-3">
      <ul class="divide-y divide-default rounded-lg border border-default lg:col-span-2">
        <li v-for="item in items" :key="item.id" class="flex flex-wrap items-center gap-4 p-4">
          <div class="size-16 shrink-0 overflow-hidden rounded-md bg-elevated">
            <img v-if="item.cover" :src="item.cover" :alt="item.title" class="size-full object-cover">
          </div>
          <div class="min-w-40 flex-1">
            <NuxtLink :to="`/${productSlug}/${item.id}`" class="font-medium text-highlighted hover:text-primary">{{ item.title }}</NuxtLink>
            <p class="text-sm text-muted tabular-nums">{{ formatMoney(item.price) }}</p>
            <p v-if="item.seller" class="text-xs text-dimmed">{{ item.seller }}</p>
            <p v-if="item.stock !== undefined && item.qty > item.stock" class="text-xs text-error">Only {{ item.stock }} left</p>
          </div>
          <UInputNumber :model-value="item.qty" :min="1" :max="999" class="w-28" aria-label="Quantity" @update:model-value="v => setQty(item, v)" />
          <p class="w-28 text-right font-medium tabular-nums">{{ formatMoney(item.price * item.qty) }}</p>
          <UButton icon="i-lucide-trash-2" color="neutral" variant="ghost" :aria-label="`Remove ${item.title}`" @click="remove(item)" />
        </li>
      </ul>

      <UCard class="h-fit">
        <dl class="space-y-2 text-sm">
          <div class="flex justify-between"><dt class="text-muted">Subtotal</dt><dd class="tabular-nums">{{ formatMoney(subtotal) }}</dd></div>
          <div class="flex justify-between">
            <dt class="text-muted">Delivery</dt>
            <dd class="tabular-nums">{{ delivery ? formatMoney(delivery) : 'Free' }}</dd>
          </div>
          <div class="flex justify-between border-t border-default pt-2 text-base font-semibold text-highlighted">
            <dt>Total</dt><dd class="tabular-nums">{{ formatMoney(subtotal + delivery) }}</dd>
          </div>
        </dl>
        <p v-if="sellers > 1" class="mt-3 text-xs text-muted">From {{ sellers }} sellers: you get one order per seller, each with its own delivery fee.</p>
        <UButton to="/checkout" block label="Continue to checkout" class="mt-4" :disabled="overStock" />
      </UCard>
    </div>
  </UContainer>
</template>
