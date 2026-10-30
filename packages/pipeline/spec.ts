// The app spec is the single contract between the AI and the generator.
// The AI writes app.spec.yaml; everything predictable (SQL, RLS, metadata, CRUD screens) is derived from it.
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import * as z from 'zod'

export const ROLES = ['viewer', 'member', 'admin', 'owner'] as const
export type Role = typeof ROLES[number]

export const FIELD_TYPES = [
  'text', 'longtext', 'email', 'phone', 'url',
  'integer', 'number', 'money', 'percent',
  'boolean', 'date', 'datetime',
  'enum', 'tags', 'json',
  'relation', 'user'
] as const
export type FieldType = typeof FIELD_TYPES[number]

export const COLORS = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'] as const

// Postgres reserved words plus names the core schema or routes already use.
const PG_RESERVED = new Set(('all analyse analyze and any array as asc asymmetric authorization binary both case cast check collate collation column '
  + 'concurrently constraint create cross current_catalog current_date current_role current_schema current_time current_timestamp current_user '
  + 'default deferrable desc distinct do else end except false fetch for foreign freeze from full grant group having ilike in initially inner '
  + 'intersect into is isnull join lateral leading left like limit localtime localtimestamp natural not notnull null offset on only or order '
  + 'outer overlaps placing primary references returning right select session_user similar some symmetric system_user table tablesample then '
  + 'to trailing true union unique user using variadic verbose when where window with').split(' '))
const CORE_TABLES = new Set(['organizations', 'profiles', 'memberships', 'invitations', 'audit_log', 'users', 'roles'])
const SYSTEM_FIELDS = new Set(['id', 'org_id', 'created_at', 'updated_at', 'created_by'])
const RESERVED_SLUGS = new Set(['login', 'signup', 'forgot-password', 'reset-password', 'onboarding', 'invite', 'settings', 'auth', 'api', 'new', 'index'])

const ident = (max: number) => z.string().regex(/^[a-z][a-z0-9_]*$/, 'use snake_case: lowercase letters, digits, underscores').max(max)
const scalar = z.union([z.string(), z.number(), z.boolean()])

const FieldSchema = z.object({
  name: ident(28),
  type: z.enum(FIELD_TYPES),
  label: z.string().optional(),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  default: scalar.optional(),
  options: z.array(z.string().min(1)).optional(),
  to: ident(28).optional(),
  cascade: z.boolean().default(false),
  min: z.number().optional(),
  max: z.number().optional(),
  help: z.string().optional(),
  list: z.boolean().optional(),
  search: z.boolean().optional()
}).strict()

const PermissionsSchema = z.object({
  read: z.enum(ROLES).default('viewer'),
  create: z.enum(ROLES).default('member'),
  update: z.enum(ROLES).default('member'),
  delete: z.enum(ROLES).default('admin')
}).strict()

const EntitySchema = z.object({
  name: ident(28),
  label: z.string().optional(),
  plural: z.string().optional(),
  icon: z.string().regex(/^i-[a-z0-9]+-[a-z0-9-]+$/).default('i-lucide-folder'),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(FieldSchema).min(1),
  permissions: PermissionsSchema.prefault({}),
  // For these actions, members only touch rows they created; admins and owners touch all rows.
  own: z.array(z.enum(['update', 'delete'])).default([]),
  // org: everyone in the workspace reads it. own: non-admins only see rows they created.
  // public: every signed-in user of the app reads it (social feeds, directories); writes stay with the owner.
  visibility: z.enum(['org', 'own', 'public']).default('org'),
  attachments: z.boolean().default(false),
  realtime: z.boolean().default(true),
  sort: z.object({ field: z.string(), dir: z.enum(['asc', 'desc']).default('desc') }).optional(),
  nav: z.boolean().default(true)
}).strict()

const WhereSchema = z.record(z.string(), z.union([scalar, z.array(scalar)]))
const CardSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('count'), entity: z.string(), label: z.string().optional(), where: WhereSchema.optional(), icon: z.string().optional() }).strict(),
  z.object({ type: z.literal('sum'), entity: z.string(), field: z.string(), label: z.string().optional(), where: WhereSchema.optional(), icon: z.string().optional() }).strict(),
  z.object({ type: z.literal('breakdown'), entity: z.string(), field: z.string(), label: z.string().optional() }).strict()
])

export const SpecSchema = z.object({
  app: z.object({
    name: z.string().min(1).max(60),
    slug: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
    description: z.string().default(''),
    // org: teams share a workspace (CRM, ERP, clinic). user: every user gets a private workspace
    // created at sign-up and never sees team features (journal, finance, habits, social profiles).
    tenancy: z.enum(['org', 'user']).default('org'),
    color: z.enum(COLORS).default('indigo'),
    appId: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/, 'reverse-domain id such as com.acme.crm').optional(),
    currency: z.string().length(3).default('USD'),
    locale: z.string().default('en-US')
  }).strict(),
  entities: z.array(EntitySchema).min(1),
  dashboard: z.array(CardSchema).optional()
}).strict()

export type Spec = z.output<typeof SpecSchema>
type RawField = z.output<typeof FieldSchema>
type RawEntity = z.output<typeof EntitySchema>

export interface Field extends RawField {
  label: string
  list: boolean
  search: boolean
  // relation/user: the alias used for the embedded record in queries (company_id -> company)
  alias?: string
  fk?: string
}
export interface Entity extends Omit<RawEntity, 'fields'> {
  label: string
  plural: string
  slug: string
  title: string
  fields: Field[]
  sort: { field: string, dir: 'asc' | 'desc' }
  // Other entities pointing at this one, shown as related lists on the detail page.
  children: { entity: string, field: string }[]
}
export type Card = NonNullable<Spec['dashboard']>[number]
export interface NormalizedSpec {
  app: Spec['app'] & { appId: string, publicProfiles: boolean }
  entities: Entity[]
  dashboard: Card[]
}

export class SpecError extends Error {
  constructor(public issues: string[]) {
    super(`Invalid app spec:\n${issues.map(i => `  - ${i}`).join('\n')}`)
  }
}

const humanize = (s: string) => s.replace(/_id$/, '').split('_').map((w, i) => i === 0 ? w[0]!.toUpperCase() + w.slice(1) : w).join(' ')
const pluralize = (s: string) => /[^aeiou]y$/.test(s) ? `${s.slice(0, -1)}ies` : /(s|x|z|ch|sh)$/.test(s) ? `${s}es` : `${s}s`
const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function loadSpec(file: string): NormalizedSpec {
  return normalizeSpec(parse(readFileSync(file, 'utf8')))
}

export function normalizeSpec(input: unknown): NormalizedSpec {
  const parsed = SpecSchema.safeParse(input)
  if (!parsed.success) {
    throw new SpecError(parsed.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`))
  }
  const spec = parsed.data
  const issues: string[] = []
  const names = new Set(spec.entities.map(e => e.name))
  const slugs = new Set<string>()

  const entities: Entity[] = spec.entities.map((e) => {
    const where = `entities.${e.name}`
    if (PG_RESERVED.has(e.name)) issues.push(`${where}: "${e.name}" is a SQL reserved word, pick another name (e.g. sales_${e.name})`)
    if (CORE_TABLES.has(e.name)) issues.push(`${where}: "${e.name}" is used by the core schema`)
    const label = humanize(e.name)
    const entityLabel = e.label ?? label
    const plural = e.plural ?? pluralize(entityLabel)
    const slug = kebab(plural)
    if (RESERVED_SLUGS.has(slug)) issues.push(`${where}: route "/${slug}" is reserved, set a different plural`)
    if (slugs.has(slug)) issues.push(`${where}: route "/${slug}" is used twice`)
    slugs.add(slug)

    const fieldNames = new Set<string>()
    const fields: Field[] = e.fields.map((f) => {
      const fw = `${where}.fields.${f.name}`
      if (fieldNames.has(f.name)) issues.push(`${fw}: duplicate field`)
      fieldNames.add(f.name)
      if (SYSTEM_FIELDS.has(f.name)) issues.push(`${fw}: "${f.name}" is added automatically`)
      if (PG_RESERVED.has(f.name)) issues.push(`${fw}: "${f.name}" is a SQL reserved word`)
      if (f.type === 'enum' && !f.options?.length) issues.push(`${fw}: enum needs options`)
      if (f.type !== 'enum' && f.options) issues.push(`${fw}: options only apply to enum fields`)
      if (f.type === 'enum' && f.default !== undefined && !f.options?.includes(String(f.default))) issues.push(`${fw}: default must be one of the options`)
      if (f.type === 'relation') {
        if (!f.to) issues.push(`${fw}: relation needs "to"`)
        else if (!names.has(f.to)) issues.push(`${fw}: unknown entity "${f.to}"`)
      }
      if (f.type !== 'relation' && f.to) issues.push(`${fw}: "to" only applies to relation fields`)
      if ((f.type === 'relation' || f.type === 'user') && !f.name.endsWith('_id')) issues.push(`${fw}: ${f.type} fields must end with _id`)
      if (f.cascade && f.type !== 'relation') issues.push(`${fw}: cascade only applies to relation fields`)
      if (f.default !== undefined) {
        const d = f.default
        const ok = f.type === 'boolean' ? typeof d === 'boolean'
          : ['integer', 'number', 'money', 'percent'].includes(f.type) ? typeof d === 'number'
            : ['date', 'datetime'].includes(f.type) ? d === 'now'
              : f.type === 'user' ? d === 'me'
                : !['relation', 'tags', 'json'].includes(f.type) && typeof d === 'string'
        if (!ok) issues.push(`${fw}: invalid default for ${f.type} (booleans take true/false, numbers a number, dates "now", user fields "me")`)
      }
      if (f.unique && ['boolean', 'json', 'tags', 'longtext'].includes(f.type)) issues.push(`${fw}: ${f.type} fields cannot be unique`)
      const isRef = f.type === 'relation' || f.type === 'user'
      return {
        ...f,
        label: f.label ?? humanize(f.name),
        list: f.list ?? !['longtext', 'json'].includes(f.type),
        search: f.search ?? ['text', 'email', 'phone'].includes(f.type),
        alias: isRef ? f.name.replace(/_id$/, '') : undefined,
        fk: isRef ? `${e.name}_${f.name}_fkey` : undefined
      }
    })
    for (const f of fields) {
      if (f.alias && fieldNames.has(f.alias)) issues.push(`${where}.fields.${f.name}: field "${f.alias}" clashes with the relation alias`)
    }
    const title = e.title ?? fields.find(f => f.type === 'text')?.name ?? fields[0]!.name
    if (!fieldNames.has(title)) issues.push(`${where}: title field "${title}" does not exist`)
    const sort = e.sort ?? { field: 'created_at', dir: 'desc' as const }
    if (!fieldNames.has(sort.field) && !['created_at', 'updated_at'].includes(sort.field)) issues.push(`${where}: sort field "${sort.field}" does not exist`)
    if (fields.filter(f => f.list).length === 0) issues.push(`${where}: at least one field must be shown in the list`)

    return { ...e, label: entityLabel, plural, slug, title, fields, sort, children: [] }
  })

  // Relations must not form a required cycle, otherwise no record could ever be inserted.
  const byName = new Map(entities.map(e => [e.name, e]))
  for (const e of entities) {
    for (const f of e.fields) {
      if (f.type === 'relation' && f.to && byName.has(f.to)) byName.get(f.to)!.children.push({ entity: e.name, field: f.name })
    }
  }
  try { insertionOrder(entities, true) } catch (err) { issues.push((err as Error).message) }

  const dashboard: Card[] = spec.dashboard ?? entities.filter(e => e.nav).slice(0, 4).map(e => ({ type: 'count' as const, entity: e.name, icon: e.icon }))
  dashboard.forEach((c, i) => {
    const where = `dashboard[${i}]`
    const ent = byName.get(c.entity)
    if (!ent) return issues.push(`${where}: unknown entity "${c.entity}"`)
    if (c.type === 'sum') {
      const f = ent.fields.find(x => x.name === c.field)
      if (!f || !['integer', 'number', 'money', 'percent'].includes(f.type)) issues.push(`${where}: "${c.field}" must be a numeric field of ${ent.name}`)
    }
    if (c.type === 'breakdown') {
      const f = ent.fields.find(x => x.name === c.field)
      if (!f || !['enum', 'boolean'].includes(f.type)) issues.push(`${where}: "${c.field}" must be an enum or boolean field of ${ent.name}`)
    }
    if (c.type !== 'breakdown' && c.where) {
      for (const [k, v] of Object.entries(c.where)) {
        const f = ent.fields.find(x => x.name === k)
        if (!f || !['enum', 'boolean'].includes(f.type)) { issues.push(`${where}.where.${k}: filters only support enum or boolean fields`); continue }
        for (const val of [v].flat()) {
          if (f.type === 'enum' && !f.options!.includes(String(val))) issues.push(`${where}.where.${k}: "${val}" is not an option`)
          if (f.type === 'boolean' && typeof val !== 'boolean') issues.push(`${where}.where.${k}: use true or false`)
        }
      }
    }
  })

  if (issues.length) throw new SpecError(issues)
  if (spec.app.tenancy === 'user') {
    for (const e of entities) {
      if (e.fields.some(f => f.type === 'user') && !entities.some(x => x.visibility === 'public')) {
        issues.push(`entities.${e.name}: user fields need other users to be visible; in a user-tenancy app add a public entity or drop the field`)
      }
    }
    if (issues.length) throw new SpecError(issues)
  }
  const appId = spec.app.appId ?? `com.example.${spec.app.slug.replace(/-/g, '')}`
  // Once any data is public, author names must be readable by everyone too.
  const publicProfiles = entities.some(e => e.visibility === 'public')
  return { app: { ...spec.app, appId, publicProfiles }, entities, dashboard }
}

// Topological order so parents are created before children (used by migrations and tests).
export function insertionOrder(entities: Entity[], requiredOnly = false): Entity[] {
  const byName = new Map(entities.map(e => [e.name, e]))
  const done = new Set<string>()
  const visiting = new Set<string>()
  const out: Entity[] = []
  const visit = (e: Entity, path: string[]) => {
    if (done.has(e.name)) return
    if (visiting.has(e.name)) {
      if (requiredOnly) throw new Error(`required relations form a cycle: ${[...path, e.name].join(' -> ')}; make one of them optional`)
      return
    }
    visiting.add(e.name)
    for (const f of e.fields) {
      if (f.type !== 'relation' || !f.to || f.to === e.name) continue
      if (requiredOnly && !f.required) continue
      const target = byName.get(f.to)
      if (target) visit(target, [...path, e.name])
    }
    visiting.delete(e.name)
    done.add(e.name)
    out.push(e)
  }
  for (const e of entities) visit(e, [])
  return out
}
