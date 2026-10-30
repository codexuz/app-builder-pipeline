<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { app, commerce, entities, site } from '#core/schema'
import { isPublicEntity } from '#core/utils/meta'

const { user } = useAuth()
const cart = useCart()

// The public menu: catalogs, plus what customers do themselves (bookings); messages become "Contact".
const items = computed<NavigationMenuItem[]>(() => entities
  .filter(e => e.nav && !e.createdByFunction && (isPublicEntity(e) || e.access === 'customer' || e.access === 'inbox'))
  .map(e => e.access === 'inbox'
    ? { label: 'Contact', to: `/${e.slug}/new` }
    : { label: e.plural, to: `/${e.slug}` }))

const contact = site?.contact
const telegram = contact?.telegram ? `https://t.me/${contact.telegram}` : undefined
const instagram = contact?.instagram ? `https://instagram.com/${contact.instagram}` : undefined
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <UHeader :title="app.name" to="/">
      <UNavigationMenu :items="items" />

      <template #right>
        <ClientOnly>
          <UColorModeButton />
          <UChip v-if="commerce" :text="cart.count.value" :show="cart.count.value > 0" size="3xl" inset>
            <UButton to="/cart" icon="i-lucide-shopping-cart" color="neutral" variant="ghost" aria-label="Cart" />
          </UChip>
          <UButton v-if="user" to="/account" icon="i-lucide-user" color="neutral" variant="ghost" aria-label="Your account" />
          <UButton v-else to="/login" label="Sign in" color="neutral" variant="outline" />
        </ClientOnly>
      </template>

      <template #body>
        <UNavigationMenu :items="items" orientation="vertical" class="-mx-2.5" />
      </template>
    </UHeader>

    <UMain class="flex-1">
      <slot />
    </UMain>

    <USeparator />
    <footer class="bg-muted/40">
      <UContainer class="grid gap-6 py-8 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <p class="font-semibold text-highlighted">{{ app.name }}</p>
          <p class="mt-1 text-muted">{{ app.description }}</p>
        </div>
        <ul v-if="contact" class="space-y-1 text-muted">
          <li v-if="contact.phone"><ULink :to="`tel:${contact.phone.replace(/\s/g, '')}`" external>{{ contact.phone }}</ULink></li>
          <li v-if="contact.email"><ULink :to="`mailto:${contact.email}`" external>{{ contact.email }}</ULink></li>
          <li v-if="contact.address">{{ contact.address }}</li>
          <li v-if="contact.hours">{{ contact.hours }}</li>
        </ul>
        <ul class="space-y-1 text-muted">
          <li v-if="telegram"><ULink :to="telegram" external target="_blank">Telegram</ULink></li>
          <li v-if="instagram"><ULink :to="instagram" external target="_blank">Instagram</ULink></li>
          <li><ULink to="/app">{{ app.type === 'marketplace' ? `Sell on ${app.name}` : 'Staff sign in' }}</ULink></li>
        </ul>
      </UContainer>
    </footer>
  </div>
</template>
