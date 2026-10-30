<script setup lang="ts">
import type { RefresherCustomEvent } from '@ionic/vue'
import { app, commerce, entities, site } from '#core/schema'
import { entityByName, isPublicEntity, type SectionMeta } from '#core/utils/meta'

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

const grids = new Map<number, { reload: () => Promise<void> }>()
async function refresh(ev: RefresherCustomEvent) {
  await Promise.all([...grids.values()].map(g => g.reload()))
  await ev.target.complete()
}
const pattern = { fashion: 'ikat', luxury: 'girih', studio: 'suzani' }[app.style as string] as 'ikat' | 'girih' | 'suzani' | undefined
const contact: NonNullable<typeof site>['contact'] = site?.contact ?? {}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button /></ion-buttons>
        <ion-title>{{ app.name }}</ion-title>
        <ion-buttons slot="end"><CartButton /></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="ion-padding hero">
        <Motif v-if="pattern" :kind="pattern" class="hero-motif" />
        <h1 class="hero-title">{{ tl(hero.title) }}</h1>
        <p v-if="hero.subtitle" class="hero-text">{{ tl(hero.subtitle) }}</p>
        <ion-button v-if="hero.cta" :router-link="hero.cta.to">{{ tl(hero.cta.label) }}</ion-button>
      </div>

      <template v-for="(s, i) in sections" :key="i">
        <section v-if="s.type === 'entity'">
          <ion-list-header>
            <ion-label>{{ tl(s.title ?? entityOf(s.entity).plural) }}</ion-label>
            <ion-button v-if="entityOf(s.entity).access === 'public'" :router-link="`/${entityOf(s.entity).slug}`">{{ t('shop.viewAll') }}</ion-button>
          </ion-list-header>
          <CatalogGrid :ref="el => { if (el) grids.set(i, el as any) }" :entity="entityOf(s.entity)" :page-size="s.limit" />
        </section>
        <section v-else-if="s.type === 'text'" class="ion-padding">
          <h2 class="section-title">{{ tl(s.title) }}</h2>
          <p class="muted">{{ tl(s.body) }}</p>
        </section>
        <section v-else class="ion-padding-vertical">
          <ion-list-header><ion-label>{{ tl(s.title ?? entityOf(s.entity).label) }}</ion-label></ion-list-header>
          <p v-if="s.description" class="ion-padding-horizontal muted">{{ tl(s.description) }}</p>
          <PublicForm :entity="entityOf(s.entity)" login-path="/login" />
        </section>
      </template>

      <ion-list v-if="Object.keys(contact).length" lines="none">
        <ion-list-header><ion-label>{{ t('site.contact') }}</ion-label></ion-list-header>
        <ion-item v-if="contact.phone" :href="`tel:${contact.phone.replace(/\s/g, '')}`"><ion-label>{{ contact.phone }}</ion-label></ion-item>
        <ion-item v-if="contact.email" :href="`mailto:${contact.email}`"><ion-label>{{ contact.email }}</ion-label></ion-item>
        <ion-item v-if="contact.telegram" :href="`https://t.me/${contact.telegram}`" target="_blank"><ion-label>Telegram</ion-label></ion-item>
        <ion-item v-if="contact.address"><ion-label class="ion-text-wrap">{{ contact.address }}</ion-label></ion-item>
        <ion-item v-if="contact.hours"><ion-label class="ion-text-wrap">{{ contact.hours }}</ion-label></ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>
