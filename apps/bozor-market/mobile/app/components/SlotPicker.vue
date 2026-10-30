<script setup lang="ts">
// Choose a day, then a free time. The database re-checks on save, so two people can never share a slot.
const props = defineProps<{ label: string, error?: string, org: string | null, service?: string | null, resource?: string | null, needsService: boolean }>()
const model = defineModel<string | null | undefined>()

const { upcomingDays, freeSlots, slotLabel } = useBooking()
const days = upcomingDays()
const day = ref(days.find(d => !d.closed)?.iso ?? days[0]!.iso)
const slots = ref<string[]>([])
const loading = ref(false)

async function load() {
  model.value = undefined
  if (!props.org || (props.needsService && !props.service)) { slots.value = []; return }
  loading.value = true
  try {
    slots.value = await freeSlots(props.org, day.value, props.service, props.resource)
  } catch {
    slots.value = []
  } finally {
    loading.value = false
  }
}
watch(() => [day.value, props.org, props.service, props.resource], load, { immediate: true })

const dayLabel = (d: Date) => `${dayName(d)}, ${dayDate(d)}`
</script>

<template>
  <div class="ion-padding-horizontal ion-padding-top">
    <p class="picker-label" style="margin: 0 0 6px">{{ label }} *</p>
    <p v-if="needsService && !service" class="muted">{{ t('book.pickService') }}</p>
    <template v-else>
      <div class="slot-row">
        <ion-chip
          v-for="d in days"
          :key="d.iso"
          :color="day === d.iso ? 'primary' : undefined"
          :outline="day !== d.iso"
          :disabled="d.closed"
          @click="day = d.iso"
        >
          {{ dayLabel(d.date) }}
        </ion-chip>
      </div>
      <ion-spinner v-if="loading" name="crescent" />
      <p v-else-if="!slots.length" class="muted">{{ t('book.noSlots') }}</p>
      <div v-else>
        <ion-chip v-for="s in slots" :key="s" :color="model === s ? 'primary' : undefined" :outline="model !== s" @click="model = s">{{ slotLabel(s) }}</ion-chip>
      </div>
    </template>
    <span v-if="error" class="field-error" style="padding-inline: 0">{{ error }}</span>
  </div>
</template>
