<script setup lang="ts">
const entity = useEntityRoute()
const { can } = usePermissions()
useHead({ title: entity.plural })
</script>

<template>
  <UDashboardPanel :id="`list-${entity.name}`">
    <template #header>
      <UDashboardNavbar :title="entity.plural" :icon="entity.icon">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton v-if="can(entity, 'create')" :to="`/app/${entity.slug}/new`" icon="i-lucide-plus" :label="`New ${entity.label.toLowerCase()}`" />
        </template>
      </UDashboardNavbar>
    </template>
    <template #body>
      <p v-if="entity.description" class="text-sm text-muted">{{ entity.description }}</p>
      <EntityTable :key="entity.name" :entity="entity" />
    </template>
  </UDashboardPanel>
</template>
