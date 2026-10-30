<script setup lang="ts">
import { app, commerce, entities, site } from '#core/schema'
import { entityByName, isPublicEntity } from '#core/utils/meta'

const { user } = useAuth()
const cart = useCart()
const { lang, setLang, options } = useLang()
const menuOpen = ref(false)
const query = ref('')

const items = computed(() => entities
  .filter(e => e.nav && !e.builtIn && (isPublicEntity(e) || e.access === 'customer' || e.access === 'inbox'))
  .map(e => e.access === 'inbox'
    ? { label: t('site.contact'), to: `/${e.slug}/new` }
    : { label: tl(e.plural), to: `/${e.slug}` }))

const catalog = commerce ? entityByName(commerce.product) : undefined
function search() {
  if (catalog) navigateTo({ path: `/${catalog.slug}`, query: query.value.trim() ? { q: query.value.trim() } : {} })
}

const contact = site?.contact
const telegram = contact?.telegram ? `https://t.me/${contact.telegram}` : undefined
const instagram = contact?.instagram ? `https://instagram.com/${contact.instagram}` : undefined
const langItems = computed(() => options.map(o => ({
  label: o.label,
  icon: o.code === lang.value ? 'i-lucide-check' : undefined,
  onSelect: () => setLang(o.code)
})))
</script>

<template>
  <div class="site">
    <header class="site-header">
      <SiteMotif v-if="app.style === 'market'" kind="awning" />
      <div class="site-header__bar">
        <UButton class="site-menu-button" icon="i-lucide-menu" color="neutral" variant="ghost" :aria-label="t('site.openMenu')" @click="menuOpen = true" />
        <NuxtLink to="/" class="site-brand">{{ app.name }}</NuxtLink>
        <form v-if="app.style === 'market' && catalog" class="site-search ms-4" role="search" @submit.prevent="search">
          <UInput v-model="query" size="lg" icon="i-lucide-search" :placeholder="t('shop.searchIn', { name: tl(catalog.plural) })" class="w-full" :aria-label="t('shop.search')" />
        </form>
        <nav v-else class="site-nav ms-4" :aria-label="t('site.home')">
          <NuxtLink v-for="i in items" :key="i.to" :to="i.to">{{ i.label }}</NuxtLink>
        </nav>
        <div class="site-actions">
          <UDropdownMenu v-if="options.length > 1" :items="langItems" :content="{ align: 'end' }">
            <UButton color="neutral" variant="ghost" :label="lang.toUpperCase()" :aria-label="t('site.language')" />
          </UDropdownMenu>
          <ClientOnly>
            <UChip v-if="commerce" :text="cart.count.value" :show="cart.count.value > 0" size="3xl" inset>
              <UButton to="/cart" icon="i-lucide-shopping-cart" color="neutral" variant="ghost" :aria-label="t('cart.title')" />
            </UChip>
            <UButton v-if="user" to="/account" icon="i-lucide-user" color="neutral" variant="ghost" :aria-label="t('account.title')" />
            <UButton v-else to="/login" icon="i-lucide-user" color="neutral" variant="ghost" :aria-label="t('auth.signIn')" />
          </ClientOnly>
        </div>
      </div>
    </header>

    <USlideover v-model:open="menuOpen" side="left" :title="app.name">
      <template #body>
        <nav class="flex flex-col gap-1">
          <NuxtLink v-for="i in items" :key="i.to" :to="i.to" class="rounded-md px-2 py-2 text-lg text-highlighted hover:bg-elevated" @click="menuOpen = false">{{ i.label }}</NuxtLink>
        </nav>
      </template>
    </USlideover>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="site-wrap site-footer__grid">
        <div>
          <strong>{{ app.name }}</strong>
          <p class="mt-1 max-w-prose">{{ app.description }}</p>
        </div>
        <ul v-if="contact" class="space-y-1">
          <li v-if="contact.phone"><a :href="`tel:${contact.phone.replace(/\s/g, '')}`">{{ contact.phone }}</a></li>
          <li v-if="contact.email"><a :href="`mailto:${contact.email}`">{{ contact.email }}</a></li>
          <li v-if="contact.address">{{ contact.address }}</li>
          <li v-if="contact.hours">{{ contact.hours }}</li>
        </ul>
        <ul class="space-y-1">
          <li v-if="telegram"><a :href="telegram" target="_blank" rel="noopener">Telegram</a></li>
          <li v-if="instagram"><a :href="instagram" target="_blank" rel="noopener">Instagram</a></li>
          <li><NuxtLink to="/app">{{ app.type === 'marketplace' ? t('account.sell', { name: app.name }) : t('site.staffSignIn') }}</NuxtLink></li>
        </ul>
      </div>
    </footer>
  </div>
</template>
