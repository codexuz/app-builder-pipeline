<script setup lang="ts">
import { commerce } from '#core/schema'

const cart = useCart()
</script>

<template>
  <ion-button v-if="commerce" router-link="/cart" aria-label="Cart">
    <Icon name="i-lucide-shopping-cart" style="font-size: 22px" />
    <ion-badge v-if="cart.count.value" color="primary" style="margin-inline-start: 4px">{{ cart.count.value }}</ion-badge>
  </ion-button>
</template>
