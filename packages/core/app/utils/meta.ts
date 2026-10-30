// Runtime view of app.spec.yaml. The generator writes app/generated/schema.ts in this shape;
// generic screens read it so every entity gets list, detail, create and edit pages for free.
import { entities } from '#core/schema'
import { formatValue } from '#core/utils/format'

export const ROLES = ['viewer', 'member', 'admin', 'owner'] as const
export type Role = typeof ROLES[number]

export type FieldType =
  | 'text' | 'longtext' | 'email' | 'phone' | 'url'
  | 'integer' | 'number' | 'money' | 'percent'
  | 'boolean' | 'date' | 'datetime'
  | 'enum' | 'tags' | 'json'
  | 'relation' | 'user'

export interface FieldMeta {
  name: string
  type: FieldType
  label: string
  required: boolean
  unique: boolean
  default?: string | number | boolean
  options?: string[]
  to?: string
  min?: number
  max?: number
  help?: string
  list: boolean
  search: boolean
  alias?: string
  fk?: string
}

export interface EntityMeta {
  name: string
  label: string
  plural: string
  slug: string
  icon: string
  title: string
  description?: string
  fields: FieldMeta[]
  permissions: Record<'read' | 'create' | 'update' | 'delete', Role>
  own: ('update' | 'delete')[]
  visibility: 'org' | 'own' | 'public'
  attachments: boolean
  realtime: boolean
  sort: { field: string, dir: 'asc' | 'desc' }
  nav: boolean
  children: { entity: string, field: string }[]
}

export interface AppMeta {
  name: string
  slug: string
  description: string
  tenancy: 'org' | 'user'
  color: string
  appId: string
  currency: string
  locale: string
  publicProfiles: boolean
}

export type CardMeta =
  | { type: 'count', entity: string, label?: string, icon?: string, where?: Record<string, unknown> }
  | { type: 'sum', entity: string, field: string, label?: string, icon?: string, where?: Record<string, unknown> }
  | { type: 'breakdown', entity: string, field: string, label?: string }

export interface Profile { id: string, full_name: string | null, email: string | null, avatar_url?: string | null }
export type Row = Record<string, any> & { id: string, org_id: string, created_by: string | null, created_at: string, updated_at: string }

export const roleAtLeast = (role: Role | undefined, min: Role) => !!role && ROLES.indexOf(role) >= ROLES.indexOf(min)

export const entityByName = (name: string) => entities.find(e => e.name === name)
export const entityBySlug = (slug: string) => entities.find(e => e.slug === slug)
export const fieldOf = (e: EntityMeta, name: string) => e.fields.find(f => f.name === name)

const PROFILE_COLUMNS = 'id, full_name, email, avatar_url'

// Columns needed to show an entity's title, following one relation if the title is itself a link.
function titleColumns(e: EntityMeta, depth = 0): string {
  const f = fieldOf(e, e.title)
  if (!f?.alias || depth > 1) return `id, ${e.title}`
  if (f.type === 'user') return `id, ${f.name}, ${f.alias}:profiles!${f.fk}(${PROFILE_COLUMNS})`
  const target = entityByName(f.to!)!
  return `id, ${f.name}, ${f.alias}:${target.name}!${f.fk}(${titleColumns(target, depth + 1)})`
}

// PostgREST select with every relation and user field embedded, so tables and detail pages need one query.
export function selectFor(e: EntityMeta): string {
  const embeds = e.fields.filter(f => f.alias).map(f =>
    f.type === 'user'
      ? `${f.alias}:profiles!${f.fk}(${PROFILE_COLUMNS})`
      : `${f.alias}:${f.to}!${f.fk}(${titleColumns(entityByName(f.to!)!)})`)
  return ['*', ...embeds, `creator:profiles!${e.name}_created_by_fkey(${PROFILE_COLUMNS})`].join(', ')
}
export const titleSelectFor = (e: EntityMeta) => titleColumns(e)

export const personName = (p?: Profile | null) => p?.full_name || p?.email || 'Unknown user'

export function recordTitle(e: EntityMeta, row: Record<string, any> | null | undefined): string {
  if (!row) return '—'
  const f = fieldOf(e, e.title)
  if (!f) return row.id
  if (f.type === 'relation') return recordTitle(entityByName(f.to!)!, row[f.alias!])
  if (f.type === 'user') return personName(row[f.alias!])
  const text = formatValue(f, row[f.name])
  return text === '—' ? `${e.label} ${String(row.id).slice(0, 8)}` : text
}

export const navEntities = () => entities.filter(e => e.nav)
