import type { EntityMeta, Row } from '#core/utils/meta'

export interface MediaFile { name: string, size: number, url?: string }

// Files of a record. Public records (products, services) use the public bucket so pages can show
// images by URL; everything else stays private and opens through short-lived signed links.
export function useMedia(e: EntityMeta, record: Row) {
  const isPublic = e.access === 'public'
  const storage = useSupabase().storage.from(isPublic ? 'public-media' : 'attachments')
  const folder = `${record.org_id}/${e.name}/${record.id}`
  const MAX_BYTES = isPublic ? 10 * 1024 * 1024 : 25 * 1024 * 1024

  const publicUrl = (name: string) => storage.getPublicUrl(`${folder}/${name}`).data.publicUrl
  const displayName = (name: string) => name.replace(/^\d+_/, '')

  async function list(): Promise<MediaFile[]> {
    const { data, error } = await storage.list(folder, { sortBy: { column: 'created_at', order: 'asc' } })
    if (error) throw error
    return (data ?? []).filter(f => f.id).map(f => ({
      name: f.name,
      size: f.metadata?.size ?? 0,
      url: isPublic ? publicUrl(f.name) : undefined
    }))
  }

  // Uploads files; the first image of a public record becomes its cover automatically.
  async function upload(files: File[]): Promise<string[]> {
    const skipped: string[] = []
    for (const file of files) {
      if (file.size > MAX_BYTES) { skipped.push(file.name); continue }
      if (isPublic && !file.type.startsWith('image/')) { skipped.push(file.name); continue }
      const name = `${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`
      const { error } = await storage.upload(`${folder}/${name}`, file, { contentType: file.type || undefined })
      if (error) throw error
      if (isPublic && !record.cover_url) await setCover(name)
    }
    return skipped
  }

  async function setCover(name: string | null) {
    const url = name ? publicUrl(name) : null
    const { error } = await useSupabase().from(e.name).update({ cover_url: url }).eq('id', record.id)
    if (error) throw error
    record.cover_url = url
  }

  async function open(name: string) {
    if (isPublic) return window.open(publicUrl(name), '_blank', 'noopener')
    const { data, error } = await storage.createSignedUrl(`${folder}/${name}`, 60)
    if (error) throw error
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function remove(name: string) {
    const { error } = await storage.remove([`${folder}/${name}`])
    if (error) throw error
    if (isPublic && record.cover_url === publicUrl(name)) await setCover(null)
  }

  return { isPublic, list, upload, setCover, open, remove, displayName, maxBytes: MAX_BYTES }
}
