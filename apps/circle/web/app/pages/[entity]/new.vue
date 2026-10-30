<script setup lang="ts">
import { isSubmittable, type Row } from '#core/utils/meta'

definePageMeta({ layout: 'site' })

const entity = useEntityRoute()
if (!isSubmittable(entity)) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const route = useRoute()
const heading = entity.access === 'inbox' ? 'Contact us' : `New ${entity.label.toLowerCase()}`
// Links such as "Write a review" pass ?<field>=<id> to fill in what the record is about.
const preset = Object.fromEntries(entity.fields
  .filter(f => typeof route.query[f.name] === 'string')
  .map(f => [f.name, route.query[f.name]]))

function saved(row: Row | null) {
  if (row) navigateTo(`/${entity.slug}/${row.id}`, { replace: true })
}
useSeoMeta({ title: heading, description: entity.description })
</script>

<template>
  <UContainer class="max-w-2xl py-8">
    <h1 class="mb-6 text-2xl font-semibold text-highlighted">{{ heading }}</h1>
    <SitePublicForm :entity="entity" :preset="preset" @saved="saved" />
  </UContainer>
</template>
