<script setup lang="ts">
import type { EntityMeta, Row } from '#core/utils/meta'

const props = defineProps<{ entity: EntityMeta, record: Row, editable: boolean }>()

const media = useMedia(props.entity, props.record)
const toast = useToast()
const confirm = useConfirm()
const files = ref<MediaFile[]>([])
const loading = ref(true)
const uploading = ref(false)
const input = ref<HTMLInputElement>()

async function load() {
  loading.value = true
  try {
    files.value = await media.list()
  } catch (err) {
    toast.add({ title: 'Could not load files', description: friendlyError(err), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function upload(list: FileList | null) {
  if (!list?.length) return
  uploading.value = true
  try {
    const skipped = await media.upload(Array.from(list))
    if (skipped.length) {
      toast.add({ title: `Skipped ${skipped.join(', ')}`, description: media.isPublic ? 'Only images up to 10 MB.' : 'Files must be under 25 MB.', color: 'warning' })
    }
    await load()
  } catch (err) {
    toast.add({ title: 'Upload failed', description: friendlyError(err), color: 'error' })
  } finally {
    uploading.value = false
    if (input.value) input.value.value = ''
  }
}

async function remove(name: string) {
  if (!(await confirm({ title: `Delete ${media.displayName(name)}?`, confirmLabel: 'Delete', danger: true }))) return
  try {
    await media.remove(name)
    files.value = files.value.filter(f => f.name !== name)
  } catch (err) {
    toast.add({ title: 'Could not delete file', description: friendlyError(err), color: 'error' })
  }
}

async function makeCover(f: MediaFile) {
  try {
    await media.setCover(f.name)
    toast.add({ title: 'Cover image updated', color: 'success' })
  } catch (err) {
    toast.add({ title: 'Could not set cover', description: friendlyError(err), color: 'error' })
  }
}

const size = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`
onMounted(load)
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <div>
          <h3 class="font-semibold text-highlighted">{{ media.isPublic ? 'Photos' : 'Files' }}</h3>
          <p v-if="media.isPublic" class="text-xs text-muted">Shown on the public page. The cover appears in lists.</p>
        </div>
        <template v-if="editable">
          <input ref="input" type="file" multiple :accept="media.isPublic ? 'image/*' : undefined" class="hidden" @change="upload(($event.target as HTMLInputElement).files)">
          <UButton label="Upload" icon="i-lucide-upload" size="sm" color="neutral" variant="outline" :loading="uploading" @click="input?.click()" />
        </template>
      </div>
    </template>
    <div v-if="loading" class="p-4"><USkeleton class="h-6 w-full" /></div>
    <p v-else-if="!files.length" class="p-4 text-sm text-muted">{{ media.isPublic ? 'No photos yet.' : 'No files yet.' }}</p>
    <div v-else-if="media.isPublic" class="grid grid-cols-3 gap-2 p-3">
      <div v-for="f in files" :key="f.name" class="group relative aspect-square overflow-hidden rounded-md bg-elevated">
        <img :src="f.url" :alt="media.displayName(f.name)" class="size-full object-cover" loading="lazy">
        <UBadge v-if="record.cover_url === f.url" label="Cover" size="sm" class="absolute top-1 left-1" />
        <div v-if="editable" class="absolute inset-x-1 bottom-1 hidden justify-end gap-1 group-hover:flex">
          <UButton v-if="record.cover_url !== f.url" icon="i-lucide-image" size="xs" color="neutral" aria-label="Use as cover" @click="makeCover(f)" />
          <UButton icon="i-lucide-trash-2" size="xs" color="error" aria-label="Delete photo" @click="remove(f.name)" />
        </div>
      </div>
    </div>
    <ul v-else class="divide-y divide-default">
      <li v-for="f in files" :key="f.name" class="flex items-center gap-3 px-4 py-2.5">
        <UIcon name="i-lucide-file" class="size-4 shrink-0 text-muted" />
        <button type="button" class="min-w-0 flex-1 truncate text-start text-sm hover:text-primary" @click="media.open(f.name)">
          {{ media.displayName(f.name) }}
        </button>
        <span class="text-xs text-muted tabular-nums">{{ size(f.size) }}</span>
        <UButton v-if="editable" icon="i-lucide-trash-2" size="xs" color="neutral" variant="ghost" aria-label="Delete file" @click="remove(f.name)" />
      </li>
    </ul>
  </UCard>
</template>
