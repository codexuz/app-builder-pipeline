<script setup lang="ts">
import { commerce } from '#core/schema'
import { entityByName } from '#core/utils/meta'

const order = entityByName('shop_order')
const router = useIonRouter()
const { user } = useAuth()
const cart = useCart()
const notify = useNotify()
const payment = usePayment()
const methodRef = ref(commerce?.payments[0] ?? 'cash')

// The order's own fields, so a shop's extra questions (delivery date, card message) appear here automatically.
const names = new Set(['customer_name', 'phone', 'address', ...(commerce?.orderFields ?? []).map(f => f.name), 'note'])
const fields = order?.fields.filter(f => names.has(f.name)) ?? []
const schema = order ? formSchema(order, fields) : null
const state = reactive<Record<string, any>>(order
  ? newFormState(order, user.value?.id, { customer_name: user.value?.user_metadata?.full_name ?? '' })
  : {})
const errors = ref<Record<string, string>>({})
const placing = ref(false)
const items = ref<CartItem[]>([])
const subtotal = computed(() => items.value.reduce((n, i) => n + i.price * i.qty, 0))
const delivery = computed(() => cart.deliveryFee(items.value))

onIonViewWillEnter(async () => {
  items.value = await cart.items()
  if (!items.value.length) router.replace('/cart')
})

async function submit() {
  const parsed = schema!.safeParse(state)
  errors.value = {}
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.value[String(issue.path[0])] ??= issue.message
    return notify.toast(t('e.value'), 'danger')
  }
  placing.value = true
  try {
    const ids = await cart.checkout({ ...formStateToPayload(order!, state, fields), payment_method: methodRef.value })
    if (payment.isOnline(methodRef.value) && ids.length === 1) {
      await payment.start(ids[0]!)
      return
    }
    await notify.toast(t('checkout.placedNote'), 'success')
    router.navigate(ids.length === 1 ? `/${order!.slug}/${ids[0]}` : `/${order!.slug}`, 'root', 'replace')
  } catch (err) {
    await notify.error(t('checkout.failed'), err)
  } finally {
    placing.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/cart" /></ion-buttons>
        <ion-title>{{ t('checkout.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <form @submit.prevent="submit">
        <ion-list>
          <FieldInput v-for="f in fields" :key="f.name" v-model="state[f.name]" :field="f" :error="errors[f.name]" site />
          <ion-item>
            <ion-select v-model="methodRef" :label="t('checkout.payment')" label-placement="stacked" interface="action-sheet">
              <ion-select-option v-for="p in commerce?.payments ?? []" :key="p" :value="p">{{ t(`pay.${p}`) }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>
        <div class="ion-padding">
          <div class="total-row muted"><span>{{ t('cart.delivery') }}</span><span class="tabular">{{ delivery ? formatMoney(delivery) : t('cart.free') }}</span></div>
          <div class="total-row"><strong>{{ t('cart.total') }}</strong><strong class="tabular">{{ formatMoney(subtotal + delivery) }}</strong></div>
          <ion-button type="submit" expand="block" :disabled="placing">{{ t('checkout.place') }}</ion-button>
        </div>
      </form>
    </ion-content>
  </ion-page>
</template>
