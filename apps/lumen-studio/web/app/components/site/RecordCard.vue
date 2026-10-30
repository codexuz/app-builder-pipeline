<script setup lang="ts">
import { commerce } from '#core/schema'
import { recordTitle, type EntityMeta, type Row } from '#core/utils/meta'

const props = defineProps<{ entity: EntityMeta, row: Row }>()

const cart = useCart()
const toast = useToast()
const isProduct = props.entity.name === commerce?.product
const hidden = new Set([props.entity.title, commerce?.price, commerce?.stock, commerce?.active])
const details = props.entity.fields.filter(f => f.list && !f.auto && !hidden.has(f.name)).slice(0, 2)
const price = isProduct ? Number(props.row[commerce!.price]) : undefined
const soldOut = isProduct && commerce!.stock ? Number(props.row[commerce!.stock]) <= 0 : false
const hasPage = props.entity.access === 'public'
const to = hasPage ? `/${props.entity.slug}/${props.row.id}` : undefined
const title = recordTitle(props.entity, props.row)

function addToCart() {
  cart.add(props.row.id)
  toast.add({ title: `${title} added to cart`, color: 'success', icon: 'i-lucide-check', actions: [{ label: 'View cart', to: '/cart' }] })
}
</script>

<template>
  <UCard :ui="{ root: 'overflow-hidden flex flex-col', body: 'p-0 sm:p-0 flex-1 flex flex-col' }">
    <component :is="to ? 'NuxtLink' : 'div'" :to="to" class="flex flex-1 flex-col">
      <div v-if="entity.attachments" class="aspect-square bg-elevated">
        <img v-if="row.cover_url" :src="row.cover_url" :alt="title" class="size-full object-cover" loading="lazy">
        <div v-else class="flex size-full items-center justify-center">
          <UIcon :name="entity.icon" class="size-10 text-dimmed" />
        </div>
      </div>
      <div class="flex flex-1 flex-col gap-1.5 p-4">
        <p class="line-clamp-2 font-medium text-highlighted">{{ title }}</p>
        <p v-if="price !== undefined" class="text-lg font-semibold text-highlighted tabular-nums">{{ formatMoney(price) }}</p>
        <div v-for="f in details.filter(d => hasValue(row[d.name]))" :key="f.name" class="text-sm text-muted">
          <EntityValue :field="f" :row="row" site />
        </div>
        <p v-if="row.seller" class="text-xs text-dimmed">{{ row.seller.name }}</p>
      </div>
    </component>
    <div v-if="isProduct" class="p-4 pt-0">
      <UButton block :disabled="soldOut" :label="soldOut ? 'Sold out' : 'Add to cart'" :icon="soldOut ? undefined : 'i-lucide-shopping-cart'" @click="addToCart" />
    </div>
  </UCard>
</template>
