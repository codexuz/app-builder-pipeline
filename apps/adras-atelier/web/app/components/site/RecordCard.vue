<script setup lang="ts">
import { NuxtLink } from '#components'
import { commerce } from '#core/schema'
import { recordTitle, type EntityMeta, type Row } from '#core/utils/meta'

const props = defineProps<{ entity: EntityMeta, row: Row }>()

const cart = useCart()
const toast = useToast()
const isProduct = props.entity.name === commerce?.product
const hidden = new Set([props.entity.title, commerce?.price, commerce?.stock, commerce?.active])
const details = props.entity.fields.filter(f => f.list && !f.auto && !hidden.has(f.name) && hasValue(props.row[f.name])).slice(0, isProduct ? 1 : 2)
const options = computed(() => (props.row.variants as Row[] | undefined)?.filter(v => v.active) ?? [])
const price = computed(() => {
  if (!isProduct) return undefined
  const base = Number(props.row[commerce!.price])
  const prices = options.value.map(v => Number(v.price ?? base))
  return prices.length ? Math.min(...prices) : base
})
const soldOut = computed(() => {
  if (!isProduct || !commerce!.stock) return false
  return options.value.length ? options.value.every(v => v.stock <= 0) : Number(props.row[commerce!.stock]) <= 0
})
const hasPage = props.entity.access === 'public'
const to = hasPage ? `/${props.entity.slug}/${props.row.id}` : undefined
const title = computed(() => recordTitle(props.entity, props.row))

function addToCart() {
  cart.add(props.row.id)
  toast.add({
    title: t('shop.added', { name: title.value }),
    color: 'success',
    icon: 'i-lucide-check',
    actions: [{ label: t('cart.viewCart'), to: '/cart' }]
  })
}
</script>

<template>
  <article class="rec">
    <component :is="to ? NuxtLink : 'div'" :to="to" class="rec__link">
      <div v-if="entity.attachments" class="rec__media">
        <img v-if="row.cover_url" :src="row.cover_url" :alt="title" loading="lazy">
        <span v-else class="rec__blank"><UIcon :name="entity.icon" class="size-9" /></span>
      </div>
      <div class="rec__body">
        <p class="rec__title">{{ title }}</p>
        <p v-if="price !== undefined" class="rec__price">{{ formatMoney(price) }}</p>
        <div v-for="f in details" :key="f.name" class="rec__meta"><EntityValue :field="f" :row="row" site /></div>
        <p v-if="row.seller" class="rec__seller">{{ row.seller.name }}</p>
      </div>
    </component>
    <div v-if="isProduct" class="rec__action">
      <UButton v-if="options.length" block color="neutral" variant="outline" :to="to" :label="t('shop.choose')" />
      <UButton v-else block :disabled="soldOut" :label="soldOut ? t('shop.soldOut') : t('shop.add')" @click="addToCart" />
    </div>
  </article>
</template>
