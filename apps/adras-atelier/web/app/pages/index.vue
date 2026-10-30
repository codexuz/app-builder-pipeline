<script setup lang="ts">
import { app, commerce, entities, site } from '#core/schema'
import { entityByName, isPublicEntity, type SectionMeta } from '#core/utils/meta'

definePageMeta({ layout: 'site' })

const catalog = entityByName(commerce?.product ?? '') ?? entities.find(isPublicEntity)
const sections: SectionMeta[] = site?.sections.length
  ? site.sections
  : catalog ? [{ type: 'entity', entity: catalog.name, limit: 10 }] : []
const entityOf = (name: string) => entityByName(name)!

useSeoMeta({ description: app.description, ogTitle: app.name, ogDescription: app.description })
</script>

<template>
  <div>
    <SiteHero />
    <template v-for="(s, i) in sections" :key="i">
      <section v-if="s.type === 'entity'" class="site-section">
        <div class="site-wrap">
          <div class="site-section__head">
            <h2 class="site-title site-h2">{{ tl(s.title ?? entityOf(s.entity).plural) }}</h2>
            <NuxtLink v-if="entityOf(s.entity).access === 'public'" :to="`/${entityOf(s.entity).slug}`" class="text-sm text-muted hover:text-highlighted">{{ t('shop.viewAll') }}</NuxtLink>
          </div>
          <SiteRecordGrid :entity="entityOf(s.entity)" :limit="s.limit" />
        </div>
      </section>
      <section v-else-if="s.type === 'text'" class="site-section">
        <div class="site-wrap">
          <h2 class="site-title site-h2">{{ tl(s.title) }}</h2>
          <p class="site-lede mt-3">{{ tl(s.body) }}</p>
        </div>
      </section>
      <section v-else class="site-section">
        <div class="site-wrap max-w-2xl">
          <h2 class="site-title site-h2">{{ tl(s.title ?? entityOf(s.entity).label) }}</h2>
          <p v-if="s.description" class="site-lede mt-2">{{ tl(s.description) }}</p>
          <div class="mt-5"><SitePublicForm :entity="entityOf(s.entity)" /></div>
        </div>
      </section>
    </template>
  </div>
</template>
