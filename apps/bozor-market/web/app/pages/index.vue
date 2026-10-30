<script setup lang="ts">
import { app, commerce, entities, site } from '#core/schema'
import { entityByName, isPublicEntity, type SectionMeta } from '#core/utils/meta'

definePageMeta({ layout: 'site' })

const catalog = entityByName(commerce?.product ?? '') ?? entities.find(isPublicEntity)
const hero = site?.hero ?? {
  title: app.name,
  subtitle: app.description,
  cta: catalog ? { label: `Browse ${catalog.plural.toLowerCase()}`, to: `/${catalog.slug}` } : undefined
}
const sections: SectionMeta[] = site?.sections.length
  ? site.sections
  : catalog ? [{ type: 'entity', entity: catalog.name, limit: 8 }] : []
const entityOf = (name: string) => entityByName(name)!

useSeoMeta({ description: app.description, ogTitle: app.name, ogDescription: app.description })
</script>

<template>
  <div v-if="app.publicSite">
    <UPageHero
      :title="hero.title"
      :description="hero.subtitle"
      :links="hero.cta ? [{ label: hero.cta.label, to: hero.cta.to, size: 'xl', trailingIcon: 'i-lucide-arrow-right' }] : []"
    />

    <template v-for="(s, i) in sections" :key="i">
      <UPageSection v-if="s.type === 'entity'" :title="s.title ?? entityOf(s.entity).plural" :ui="{ container: 'py-10 sm:py-12 lg:py-14' }">
        <SiteRecordGrid :entity="entityOf(s.entity)" :limit="s.limit" />
        <div v-if="entityOf(s.entity).access === 'public'" class="flex justify-center">
          <UButton :to="`/${entityOf(s.entity).slug}`" label="View all" color="neutral" variant="outline" trailing-icon="i-lucide-arrow-right" />
        </div>
      </UPageSection>
      <UPageSection v-else-if="s.type === 'text'" :title="s.title" :description="s.body" :ui="{ container: 'py-10 sm:py-12 lg:py-14' }" />
      <UPageSection v-else :title="s.title ?? entityOf(s.entity).label" :description="s.description" :ui="{ container: 'py-10 sm:py-12 lg:py-14' }">
        <div class="mx-auto w-full max-w-2xl">
          <SitePublicForm :entity="entityOf(s.entity)" />
        </div>
      </UPageSection>
    </template>
  </div>
</template>
