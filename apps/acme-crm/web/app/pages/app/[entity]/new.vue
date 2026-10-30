<script setup lang="ts">
const entity = useEntityRoute()
const route = useRoute()
const router = useRouter()
useHead({ title: `New ${entity.label.toLowerCase()}` })

// Related lists link here with ?<field>=<id> to pre-fill the parent.
const preset = Object.fromEntries(entity.fields
  .filter(f => typeof route.query[f.name] === 'string')
  .map(f => [f.name, route.query[f.name]]))
</script>

<template>
  <UDashboardPanel :id="`new-${entity.name}`">
    <template #header>
      <UDashboardNavbar :title="`New ${entity.label.toLowerCase()}`" :icon="entity.icon">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-3xl">
        <EntityForm
          :entity="entity"
          :preset="preset"
          @saved="row => router.replace(`/app/${entity.slug}/${row.id}`)"
          @cancel="router.back()"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
