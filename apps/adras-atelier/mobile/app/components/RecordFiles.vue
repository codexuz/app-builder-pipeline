<script setup lang="ts">
import type { EntityMeta, Row } from '#core/utils/meta'

const props = defineProps<{ entity: EntityMeta, record: Row, editable: boolean }>()

const media = useMedia(props.entity, props.record)
const notify = useNotify()
const files = ref<MediaFile[]>([])
const uploading = ref(false)
const input = ref<HTMLInputElement>()
const size = (b: number) => b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`

async function load() {
  try {
    files.value = await media.list()
  } catch (err) {
    await notify.error('Could not load files', err)
  }
}

// The file input opens the camera or photo library on phones.
async function upload(list: FileList | null) {
  if (!list?.length) return
  uploading.value = true
  try {
    const skipped = await media.upload(Array.from(list))
    if (skipped.length) await notify.toast(`Skipped ${skipped.join(', ')}`, 'danger')
    await load()
  } catch (err) {
    await notify.error('Upload failed', err)
  } finally {
    uploading.value = false
    if (input.value) input.value.value = ''
  }
}

async function remove(name: string) {
  if (!(await notify.confirm(`Delete ${media.displayName(name)}?`, undefined, 'Delete', true))) return
  try {
    await media.remove(name)
    files.value = files.value.filter(f => f.name !== name)
  } catch (err) {
    await notify.error('Could not delete file', err)
  }
}

async function makeCover(f: MediaFile) {
  try {
    await media.setCover(f.name)
    await notify.toast('Cover image updated', 'success')
  } catch (err) {
    await notify.error('Could not set cover', err)
  }
}

onMounted(load)
</script>

<template>
  <ion-list>
    <ion-list-header>
      <ion-label>{{ media.isPublic ? 'Photos' : 'Files' }}</ion-label>
      <template v-if="editable">
        <input ref="input" type="file" multiple :accept="media.isPublic ? 'image/*' : undefined" hidden @change="upload(($event.target as HTMLInputElement).files)">
        <ion-button :disabled="uploading" @click="input?.click()">{{ uploading ? 'Uploading…' : 'Upload' }}</ion-button>
      </template>
    </ion-list-header>
    <ion-item v-if="!files.length" lines="none">
      <ion-label class="muted">{{ media.isPublic ? 'No photos yet.' : 'No files yet.' }}</ion-label>
    </ion-item>
    <ion-item-sliding v-for="f in files" :key="f.name">
      <ion-item button @click="media.open(f.name)">
        <ion-thumbnail v-if="f.url" slot="start"><img :src="f.url" :alt="media.displayName(f.name)"></ion-thumbnail>
        <Icon v-else slot="start" name="i-lucide-file" class="menu-icon" />
        <ion-label>
          {{ media.displayName(f.name) }}
          <p v-if="record.cover_url && record.cover_url === f.url">Cover image</p>
        </ion-label>
        <ion-note slot="end">{{ size(f.size) }}</ion-note>
      </ion-item>
      <ion-item-options v-if="editable" side="end">
        <ion-item-option v-if="media.isPublic && record.cover_url !== f.url" color="medium" @click="makeCover(f)">Cover</ion-item-option>
        <ion-item-option color="danger" @click="remove(f.name)">Delete</ion-item-option>
      </ion-item-options>
    </ion-item-sliding>
  </ion-list>
</template>
