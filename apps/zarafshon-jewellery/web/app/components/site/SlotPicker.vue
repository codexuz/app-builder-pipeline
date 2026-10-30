<script setup lang="ts">
// Choose a day, then a free time. The database re-checks on save, so two people can never share a slot.
const props = defineProps<{ org: string | null, service?: string | null, resource?: string | null, needsService: boolean }>()
const model = defineModel<string | null | undefined>()

const { upcomingDays, freeSlots, slotLabel } = useBooking()
const days = upcomingDays()
const day = ref(days.find(d => !d.closed)?.iso ?? days[0]!.iso)
const slots = ref<string[]>([])
const loading = ref(false)
const failed = ref(false)

async function load() {
  model.value = undefined
  failed.value = false
  if (!props.org || (props.needsService && !props.service)) { slots.value = []; return }
  loading.value = true
  try {
    slots.value = await freeSlots(props.org, day.value, props.service, props.resource)
  } catch {
    failed.value = true
    slots.value = []
  } finally {
    loading.value = false
  }
}
watch(() => [day.value, props.org, props.service, props.resource], load, { immediate: true })

</script>

<template>
  <div class="space-y-3">
    <p v-if="needsService && !service" class="text-sm text-muted">{{ t('book.pickService') }}</p>
    <template v-else>
      <div class="chips" role="group" :aria-label="t('book.day')">
        <button
          v-for="d in days"
          :key="d.iso"
          type="button"
          class="chip text-center"
          :aria-pressed="day === d.iso"
          :disabled="d.closed"
          :title="d.closed ? t('book.closed') : undefined"
          @click="day = d.iso"
        >
          <span class="block text-xs capitalize">{{ dayName(d.date) }}</span>
          <span class="block font-semibold whitespace-nowrap">{{ dayDate(d.date) }}</span>
        </button>
      </div>
      <USkeleton v-if="loading" class="h-10 w-full" />
      <p v-else-if="failed" class="text-sm text-error">{{ t('form.couldNotLoad') }}</p>
      <p v-else-if="!slots.length" class="text-sm text-muted">{{ t('book.noSlots') }}</p>
      <div v-else class="flex flex-wrap gap-2" role="group" :aria-label="t('book.time')">
        <button
          v-for="s in slots"
          :key="s"
          type="button"
          class="chip tabular-nums"
          :aria-pressed="model === s"
          @click="model = s"
        >
          {{ slotLabel(s) }}
        </button>
      </div>
    </template>
  </div>
</template>
