<script setup lang="ts">
import type { EntityMeta, Row } from '#core/utils/meta'

const props = defineProps<{ entity: EntityMeta, record: Row, editable: boolean }>()

const MAX_BYTES = 25 * 1024 * 1024
const storage = useSupabase().storage.from('attachments')
const notify = useNotify()
const files = ref<{ name: string, size: number }[]>([])
const uploading = ref(false)
const input = ref<HTMLInputElement>()

// Same layout as the web app: <org_id>/<table>/<record_id>/<file>, checked by storage policies.
const folder = computed(() => `${props.record.org_id}/${props.entity.name}/${props.record.id}`)
const displayName = (name: string) => name.replace(/^\d+_/, '')
const size = (b: number) => b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`

async function load() {
  const { data, error } = await storage.list(folder.value, { sortBy: { column: 'created_at', order: 'desc' } })
  if (error) return notify.error('Could not load files', error)
  files.value = (data ?? []).filter(f => f.id).map(f => ({ name: f.name, size: f.metadata?.size ?? 0 }))
}

// The file input opens the camera or photo library on phones.
async function upload(list: FileList | null) {
  if (!list?.length) return
  uploading.value = true
  try {
    for (const file of Array.from(list)) {
      if (file.size > MAX_BYTES) { await notify.toast(`${file.name} is larger than 25 MB`, 'danger'); continue }
      const safe = file.name.replace(/[^\w.\-]+/g, '_')
      const { error } = await storage.upload(`${folder.value}/${Date.now()}_${safe}`, file, { contentType: file.type || undefined })
      if (error) throw error
    }
    await load()
  } catch (err) {
    await notify.error('Upload failed', err)
  } finally {
    uploading.value = false
    if (input.value) input.value.value = ''
  }
}

async function open(name: string) {
  const { data, error } = await storage.createSignedUrl(`${folder.value}/${name}`, 60)
  if (error) return notify.error('Could not open file', error)
  window.open(data.signedUrl, '_blank')
}

async function remove(name: string) {
  if (!(await notify.confirm(`Delete ${displayName(name)}?`, undefined, 'Delete', true))) return
  const { error } = await storage.remove([`${folder.value}/${name}`])
  if (error) return notify.error('Could not delete file', error)
  files.value = files.value.filter(f => f.name !== name)
}

onMounted(load)
</script>

<template>
  <ion-list>
    <ion-list-header>
      <ion-label>Files</ion-label>
      <template v-if="editable">
        <input ref="input" type="file" multiple hidden @change="upload(($event.target as HTMLInputElement).files)">
        <ion-button :disabled="uploading" @click="input?.click()">{{ uploading ? 'Uploading…' : 'Upload' }}</ion-button>
      </template>
    </ion-list-header>
    <ion-item v-if="!files.length" lines="none">
      <ion-label class="muted">No files yet.</ion-label>
    </ion-item>
    <ion-item-sliding v-for="f in files" :key="f.name">
      <ion-item button @click="open(f.name)">
        <Icon slot="start" name="i-lucide-file" class="menu-icon" />
        <ion-label>{{ displayName(f.name) }}</ion-label>
        <ion-note slot="end">{{ size(f.size) }}</ion-note>
      </ion-item>
      <ion-item-options v-if="editable" side="end">
        <ion-item-option color="danger" @click="remove(f.name)">Delete</ion-item-option>
      </ion-item-options>
    </ion-item-sliding>
  </ion-list>
</template>
