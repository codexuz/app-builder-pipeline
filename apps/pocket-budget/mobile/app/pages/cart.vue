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
    await notify.error('Could not load your cart', err)
  } finally {
    loading.value = false
  }
}
onIonViewWillEnter(load)

function change(item: CartItem, by: number) {
  const qty = item.qty + by
  if (qty < 1) {
    cart.remove(item.id)
    items.value = items.value.filter(i => i.id !== item.id)
    return
  }
  cart.setQty(item.id, qty)
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
        <ion-title>Your cart</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-progress-bar v-if="loading" type="indeterminate" />
      <div v-else-if="!items.length" class="empty-state">
        <Icon name="i-lucide-shopping-cart" />
        <p>Your cart is empty.</p>
        <ion-button router-link="/" router-direction="root">Start shopping</ion-button>
      </div>
      <ion-list v-else>
        <ion-item v-for="item in items" :key="item.id">
          <ion-thumbnail v-if="item.cover" slot="start"><img :src="item.cover" :alt="item.title"></ion-thumbnail>
          <ion-label class="ion-text-wrap">
            <h3>{{ item.title }}</h3>
            <p class="tabular">{{ formatMoney(item.price) }}</p>
            <p v-if="item.stock !== undefined && item.qty > item.stock" style="color: var(--ion-color-danger)">Only {{ item.stock }} left</p>
          </ion-label>
          <div slot="end" class="qty-row" style="margin: 0">
            <ion-button fill="clear" size="small" :aria-label="`One less ${item.title}`" @click="change(item, -1)">−</ion-button>
            <span class="tabular">{{ item.qty }}</span>
            <ion-button fill="clear" size="small" :aria-label="`One more ${item.title}`" @click="change(item, 1)">+</ion-button>
          </div>
        </ion-item>
      </ion-list>
    </ion-content>
    <ion-footer v-if="items.length">
      <ion-toolbar>
        <div class="ion-padding-horizontal">
          <div class="total-row muted"><span>Delivery</span><span class="tabular">{{ delivery ? formatMoney(delivery) : 'Free' }}</span></div>
          <div class="total-row"><strong>Total</strong><strong class="tabular">{{ formatMoney(subtotal + delivery) }}</strong></div>
          <ion-button expand="block" router-link="/checkout" :disabled="overStock">Continue to checkout</ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>
