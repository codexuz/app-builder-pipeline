<script setup lang="ts">
import type { EntityMeta, Row } from '#core/utils/meta'

const props = defineProps<{ entity: EntityMeta, record: Row, editable: boolean }>()

const BUCKET = 'attachments'
const MAX_BYTES = 25 * 1024 * 1024
const storage = useSupabase().storage.from(BUCKET)
const toast = useToast()
const confirm = useConfirm()
const files = ref<{ name: string, size: number, created_at: string | null }[]>([])
const loading = ref(true)
const uploading = ref(false)
const input = ref<HTMLInputElement>()

// Paths start with the owning workspace id; storage policies check membership against it.
const folder = computed(() => `${props.record.org_id}/${props.entity.name}/${props.record.id}`)

async function load() {
  loading.value = true
  const { data, error } = await storage.list(folder.value, { sortBy: { column: 'created_at', order: 'desc' } })
  loading.value = false
  if (error) return toast.add({ title: 'Could not load files', description: error.message, color: 'error' })
  files.value = (data ?? []).filter(f => f.id).map(f => ({ name: f.name, size: f.metadata?.size ?? 0, created_at: f.created_at }))
}

async function upload(list: FileList | null) {
  if (!list?.length) return
  uploading.value = true
  try {
    for (const file of Array.from(list)) {
      if (file.size > MAX_BYTES) {
        toast.add({ title: `${file.name} is larger than 25 MB`, color: 'warning' })
        continue
      }
      const safe = file.name.replace(/[^\w.\-]+/g, '_')
      const { error } = await storage.upload(`${folder.value}/${Date.now()}_${safe}`, file, { contentType: file.type || undefined })
      if (error) throw error
    }
    await load()
  } catch (err) {
    toast.add({ title: 'Upload failed', description: friendlyError(err), color: 'error' })
  } finally {
    uploading.value = false
    if (input.value) input.value.value = ''
  }
}

async function open(name: string) {
  const { data, error } = await storage.createSignedUrl(`${folder.value}/${name}`, 60)
  if (error) return toast.add({ title: 'Could not open file', description: error.message, color: 'error' })
  window.open(data.signedUrl, '_blank', 'noopener')
}

async function remove(name: string) {
  if (!(await confirm({ title: `Delete ${displayName(name)}?`, confirmLabel: 'Delete', danger: true }))) return
  const { error } = await storage.remove([`${folder.value}/${name}`])
  if (error) return toast.add({ title: 'Could not delete file', description: error.message, color: 'error' })
  files.value = files.value.filter(f => f.name !== name)
}

const displayName = (name: string) => name.replace(/^\d+_/, '')
const size = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`

onMounted(load)
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-semibold text-highlighted">Files</h3>
        <template v-if="editable">
          <input ref="input" type="file" multiple class="hidden" @change="upload(($event.target as HTMLInputElement).files)">
          <UButton label="Upload" icon="i-lucide-upload" size="sm" color="neutral" variant="outline" :loading="uploading" @click="input?.click()" />
        </template>
      </div>
    </template>
    <div v-if="loading" class="p-4"><USkeleton class="h-6 w-full" /></div>
    <p v-else-if="!files.length" class="p-4 text-sm text-muted">No files yet.</p>
    <ul v-else class="divide-y divide-default">
      <li v-for="f in files" :key="f.name" class="flex items-center gap-3 px-4 py-2.5">
        <UIcon name="i-lucide-file" class="size-4 shrink-0 text-muted" />
        <button type="button" class="min-w-0 flex-1 truncate text-start text-sm hover:text-primary" @click="open(f.name)">
          {{ displayName(f.name) }}
        </button>
        <span class="text-xs text-muted tabular-nums">{{ size(f.size) }}</span>
        <UButton v-if="editable" icon="i-lucide-trash-2" size="xs" color="neutral" variant="ghost" aria-label="Delete file" @click="remove(f.name)" />
      </li>
    </ul>
  </UCard>
</template>
