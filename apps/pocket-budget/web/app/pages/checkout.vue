<script setup lang="ts">
import { commerce } from '#core/schema'
import { entityByName } from '#core/utils/meta'

definePageMeta({ layout: 'site' })
useHead({ title: 'Checkout' })

if (!commerce) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const order = entityByName('shop_order')!
const { user } = useAuth()
const cart = useCart()
const toast = useToast()

// The order's own fields, so a shop's extra questions (delivery date, card message) appear here automatically.
const names = new Set(['customer_name', 'phone', 'address', ...commerce.orderFields.map(f => f.name), 'note'])
const fields = order.fields.filter(f => names.has(f.name))
const schema = formSchema(order, fields)
const state = reactive<Record<string, any>>(newFormState(order, user.value?.id, {
  customer_name: user.value?.user_metadata?.full_name ?? ''
}))
const payment = ref(commerce.payments[0]!)
const paymentItems = commerce.payments.map(p => ({ label: PAYMENT_LABELS[p] ?? humanize(p), value: p }))
const placing = ref(false)
const items = ref<CartItem[]>([])
const subtotal = computed(() => items.value.reduce((n, i) => n + i.price * i.qty, 0))
const delivery = computed(() => cart.deliveryFee(items.value))

onMounted(async () => {
  items.value = await cart.items()
  if (!items.value.length) navigateTo('/cart', { replace: true })
})

async function onSubmit() {
  placing.value = true
  try {
    const ids = await cart.checkout({ ...formStateToPayload(order, state, fields), payment_method: payment.value })
    toast.add({ title: 'Order placed', description: 'We will contact you to confirm it.', color: 'success', icon: 'i-lucide-check' })
    await navigateTo(ids.length === 1 ? `/${order.slug}/${ids[0]}` : `/${order.slug}`, { replace: true })
  } catch (err) {
    toast.add({ title: 'Could not place the order', description: friendlyError(err), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    placing.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <h1 class="mb-6 text-2xl font-semibold text-highlighted">Checkout</h1>
    <UForm :schema="schema" :state="state" class="grid gap-8 lg:grid-cols-3" @submit="onSubmit">
      <div class="space-y-5 lg:col-span-2">
        <div class="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <UFormField
            v-for="f in fields"
            :key="f.name"
            :name="f.name"
            :label="f.label"
            :description="f.help"
            :required="f.required"
            :class="['longtext', 'tags'].includes(f.type) ? 'sm:col-span-2' : ''"
          >
            <EntityFieldInput v-model="state[f.name]" :field="f" site />
          </UFormField>
        </div>
        <UFormField label="Payment">
          <URadioGroup v-model="payment" :items="paymentItems" />
        </UFormField>
      </div>

      <UCard class="h-fit">
        <ul class="space-y-1 text-sm">
          <li v-for="i in items" :key="i.id" class="flex justify-between gap-3">
            <span class="min-w-0 truncate">{{ i.qty }} × {{ i.title }}</span>
            <span class="tabular-nums">{{ formatMoney(i.price * i.qty) }}</span>
          </li>
        </ul>
        <dl class="mt-3 space-y-1 border-t border-default pt-3 text-sm">
          <div class="flex justify-between"><dt class="text-muted">Delivery</dt><dd class="tabular-nums">{{ delivery ? formatMoney(delivery) : 'Free' }}</dd></div>
          <div class="flex justify-between text-base font-semibold text-highlighted"><dt>Total</dt><dd class="tabular-nums">{{ formatMoney(subtotal + delivery) }}</dd></div>
        </dl>
        <p class="mt-2 text-xs text-muted">The shop confirms the final total when it receives your order.</p>
        <UButton type="submit" block label="Place order" class="mt-4" :loading="placing" />
      </UCard>
    </UForm>
  </UContainer>
</template>
