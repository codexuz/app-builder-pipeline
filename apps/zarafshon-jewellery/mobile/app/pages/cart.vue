<script setup lang="ts">
const cart = useCart()
const notify = useNotify()
const items = ref<CartItem[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    items.value = await cart.items()
  } catch (err) {
    await notify.error(t('form.couldNotLoad'), err)
  } finally {
    loading.value = false
  }
}
onIonViewWillEnter(load)

function change(item: CartItem, by: number) {
  const qty = item.qty + by
  if (qty < 1) {
    cart.remove(item.key)
    items.value = items.value.filter(i => i.key !== item.key)
    return
  }
  cart.setQty(item.key, qty)
  item.qty = qty
}

const subtotal = computed(() => items.value.reduce((n, i) => n + i.price * i.qty, 0))
const delivery = computed(() => cart.deliveryFee(items.value))
const overStock = computed(() => items.value.some(i => i.stock !== undefined && i.qty > i.stock))
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" /></ion-buttons>
        <ion-title>{{ t('cart.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-progress-bar v-if="loading" type="indeterminate" />
      <div v-else-if="!items.length" class="empty-state">
        <Icon name="i-lucide-shopping-cart" />
        <p>{{ t('cart.empty') }}</p>
        <ion-button router-link="/" router-direction="root">{{ t('cart.start') }}</ion-button>
      </div>
      <ion-list v-else>
        <ion-item v-for="item in items" :key="item.key">
          <ion-thumbnail v-if="item.cover" slot="start"><img :src="item.cover" :alt="item.title"></ion-thumbnail>
          <ion-label class="ion-text-wrap">
            <h3>{{ item.title }}</h3>
            <p v-if="item.variantName">{{ item.variantName }}</p>
            <p class="tabular">{{ formatMoney(item.price) }}</p>
            <p v-if="item.stock !== undefined && item.qty > item.stock" style="color: var(--ion-color-danger)">{{ t('shop.left', { n: item.stock }) }}</p>
          </ion-label>
          <div slot="end" class="qty-row" style="margin: 0">
            <ion-button fill="clear" size="small" :aria-label="t('cart.remove')" @click="change(item, -1)">−</ion-button>
            <span class="tabular">{{ item.qty }}</span>
            <ion-button fill="clear" size="small" :aria-label="t('form.add')" @click="change(item, 1)">+</ion-button>
          </div>
        </ion-item>
      </ion-list>
    </ion-content>
    <ion-footer v-if="items.length">
      <ion-toolbar>
        <div class="ion-padding-horizontal">
          <div class="total-row muted"><span>{{ t('cart.delivery') }}</span><span class="tabular">{{ delivery ? formatMoney(delivery) : t('cart.free') }}</span></div>
          <div class="total-row"><strong>{{ t('cart.total') }}</strong><strong class="tabular">{{ formatMoney(subtotal + delivery) }}</strong></div>
          <ion-button expand="block" router-link="/checkout" :disabled="overStock">{{ t('cart.checkout') }}</ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>
