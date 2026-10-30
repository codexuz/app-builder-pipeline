<script setup lang="ts">
import { commerce } from '#core/schema'
import { entityByName } from '#core/utils/meta'

definePageMeta({ layout: 'site' })
useHead({ title: () => t('checkout.title') })

if (!commerce) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const order = entityByName('shop_order')!
const { user } = useAuth()
const cart = useCart()
const toast = useToast()
const payment = usePayment()

// The order's own fields, so a shop's extra questions (delivery date, card message) appear here automatically.
const names = new Set(['customer_name', 'phone', 'address', ...commerce.orderFields.map(f => f.name), 'note'])
const fields = order.fields.filter(f => names.has(f.name))
const schema = formSchema(order, fields)
const state = reactive<Record<string, any>>(newFormState(order, user.value?.id, {
  customer_name: user.value?.user_metadata?.full_name ?? ''
}))
const method = ref(commerce.payments[0]!)
const methods = computed(() => commerce!.payments.map(p => ({ label: t(`pay.${p}`), value: p })))
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
    const ids = await cart.checkout({ ...formStateToPayload(order, state, fields), payment_method: method.value })
    if (payment.isOnline(method.value) && ids.length === 1) {
      await payment.start(ids[0]!)
      return
    }
    toast.add({ title: t('checkout.placed'), description: t('checkout.placedNote'), color: 'success', icon: 'i-lucide-check' })
    await navigateTo(ids.length === 1 ? `/${order.slug}/${ids[0]}` : `/${order.slug}`, { replace: true })
  } catch (err) {
    toast.add({ title: t('checkout.failed'), description: friendlyError(err), color: 'error', icon: 'i-lucide-circle-alert' })
  } finally {
    placing.value = false
  }
}
</script>

<template>
  <div class="site-section site-wrap">
    <h1 class="site-title site-h1 mb-6">{{ t('checkout.title') }}</h1>
    <UForm :schema="schema" :state="state" class="grid gap-8 lg:grid-cols-3" @submit="onSubmit">
      <div class="space-y-5 lg:col-span-2">
        <div class="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <UFormField
            v-for="f in fields"
            :key="f.name"
            :name="f.name"
            :label="tl(f.label)"
            :description="f.help ? tl(f.help) : undefined"
            :required="f.required"
            :class="['longtext', 'tags'].includes(f.type) ? 'sm:col-span-2' : ''"
          >
            <EntityFieldInput v-model="state[f.name]" :field="f" site />
          </UFormField>
        </div>
        <UFormField :label="t('checkout.payment')">
          <div class="flex flex-wrap gap-2" role="radiogroup">
            <button v-for="m in methods" :key="m.value" type="button" class="chip" :aria-pressed="method === m.value" @click="method = m.value">{{ m.label }}</button>
          </div>
        </UFormField>
      </div>

      <aside class="h-fit rounded-lg bg-elevated p-5 lg:sticky lg:top-24">
        <ul class="space-y-1 text-sm">
          <li v-for="i in items" :key="i.key" class="flex justify-between gap-3">
            <span class="min-w-0 truncate">{{ i.qty }} × {{ i.title }}<template v-if="i.variantName">, {{ i.variantName }}</template></span>
            <span class="tabular-nums">{{ formatMoney(i.price * i.qty) }}</span>
          </li>
        </ul>
        <dl class="mt-3 space-y-1 border-t border-default pt-3">
          <div class="flex justify-between text-sm"><dt class="text-muted">{{ t('cart.delivery') }}</dt><dd class="tabular-nums">{{ delivery ? formatMoney(delivery) : t('cart.free') }}</dd></div>
          <div class="flex justify-between text-lg font-bold text-highlighted"><dt>{{ t('cart.total') }}</dt><dd class="tabular-nums">{{ formatMoney(subtotal + delivery) }}</dd></div>
        </dl>
        <p class="mt-2 text-xs text-muted">{{ t('checkout.confirmNote') }}</p>
        <UButton type="submit" block size="lg" :label="t('checkout.place')" class="mt-4" :loading="placing" />
      </aside>
    </UForm>
  </div>
</template>
