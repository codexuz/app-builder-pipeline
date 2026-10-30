<script setup lang="ts">
import { app, commerce, entities, scheduling, site } from '#core/schema'
import { entityByName, isPublicEntity } from '#core/utils/meta'

// The first screen differs by style: a stall banner, an ikat field, a glazed plate, a tiled vault, a suzani.
const catalog = entityByName(commerce?.product ?? '') ?? entities.find(isPublicEntity)
const booking = scheduling ? entityByName(scheduling.entity) : undefined
const hero = site?.hero
const title = hero?.title ?? app.name
const subtitle = hero?.subtitle ?? app.description
const cta = hero?.cta ?? (booking
  ? { label: t('book.now'), to: `/${booking.slug}/new` }
  : catalog ? { label: t('shop.viewAll'), to: `/${catalog.slug}` } : undefined)

// The fresh style shows a real product on the plate when one has a photo.
const { data: plate } = await useAsyncData('hero-plate', async () => {
  if (app.style !== 'fresh' || !catalog?.attachments) return null
  const { data } = await useSupabase().from(catalog.name).select('cover_url').not('cover_url', 'is', null).limit(1)
  return (data?.[0]?.cover_url as string | undefined) ?? null
})
const pattern = { fashion: 'ikat', luxury: 'girih', studio: 'suzani' }[app.style as string] as 'ikat' | 'girih' | 'suzani' | undefined
</script>

<template>
  <section class="site-hero">
    <SiteMotif v-if="app.style === 'fashion'" kind="ikat" class="absolute inset-0 -z-10" />
    <SiteMotif v-else-if="pattern" :kind="pattern" />
    <div class="site-hero__inner">
      <div>
        <h1 class="site-hero__title"><span>{{ tl(title) }}</span></h1>
        <p class="site-hero__text">{{ tl(subtitle) }}</p>
        <div class="site-hero__cta">
          <UButton v-if="cta" :to="cta.to" size="xl" :label="tl(cta.label)" trailing-icon="i-lucide-arrow-right" />
        </div>
      </div>
      <div v-if="app.style === 'fresh'" class="hero-plate">
        <SiteMotif kind="plate" />
        <img v-if="plate" :src="plate" alt="">
      </div>
    </div>
  </section>
</template>
