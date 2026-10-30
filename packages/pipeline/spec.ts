// The app spec is the single contract between the AI (or a person) and the generator.
// Everything predictable (SQL, row-level security, metadata, screens, checkout) is derived from it,
// and every rule below is enforced here so a wrong spec fails early with a message that says how to fix it.
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import * as z from 'zod'

export const ROLES = ['viewer', 'member', 'admin', 'owner'] as const
export type Role = typeof ROLES[number]

// team: staff share a workspace (CRM, inventory, projects). personal: every user gets a private workspace.
// business: one company or shop with staff, customers and anonymous visitors (shop, salon, school site).
// marketplace: many seller workspaces, one public catalog, customers buy across sellers (Uzum-style).
export const APP_TYPES = ['team', 'personal', 'business', 'marketplace'] as const
export type AppType = typeof APP_TYPES[number]

// Who may read and write an entity. Each word maps to fixed, tested row-level security.
export const ACCESS = ['team', 'private', 'members', 'public', 'customer', 'inbox'] as const
export type Access = typeof ACCESS[number]

export const FIELD_TYPES = [
  'text', 'longtext', 'email', 'phone', 'url',
  'integer', 'number', 'money', 'percent',
  'boolean', 'date', 'datetime',
  'enum', 'tags', 'json',
  'relation', 'user'
] as const
export type FieldType = typeof FIELD_TYPES[number]

export const COLORS = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'] as const
export const PAYMENT_METHODS = ['cash'] as const

// Postgres reserved words plus names the core schema or routes already use.
const PG_RESERVED = new Set(('all analyse analyze and any array as asc asymmetric authorization binary both case cast check collate collation column '
  + 'concurrently constraint create cross current_catalog current_date current_role current_schema current_time current_timestamp current_user '
  + 'default deferrable desc distinct do else end except false fetch for foreign freeze from full grant group having ilike in initially inner '
  + 'intersect into is isnull join lateral leading left like limit localtime localtimestamp natural not notnull null offset on only or order '
  + 'outer overlaps placing primary references returning right select session_user similar some symmetric system_user table tablesample then '
  + 'to trailing true union unique user using variadic verbose when where window with').split(' '))
const CORE_TABLES = new Set(['organizations', 'profiles', 'memberships', 'invitations', 'audit_log', 'users', 'roles', 'shop_order', 'shop_order_item'])
const SYSTEM_FIELDS = new Set(['id', 'org_id', 'created_at', 'updated_at', 'created_by', 'cover_url', 'creator', 'seller'])
const RESERVED_SLUGS = new Set(['app', 'login', 'signup', 'forgot-password', 'reset-password', 'onboarding', 'invite', 'settings', 'setup',
  'auth', 'api', 'new', 'index', 'cart', 'checkout', 'account', 'sell', 'orders'])

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
  search: z.boolean().optional(),
  // Only staff may set or change it (order status, approval). Customers' and visitors' values are ignored.
  staff: z.boolean().default(false),
  // Nobody edits it from an app; only database functions set it (totals, order numbers).
  readonly: z.boolean().default(false),
  // Filled by the app, not shown in forms (e.g. the cover image).
  auto: z.boolean().default(false)
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
  access: z.enum(ACCESS).default('team'),
  permissions: PermissionsSchema.prefault({}),
  // team access: members only change rows they created; admins change all.
  own: z.array(z.enum(['update', 'delete'])).default([]),
  // customer access: what customers may do to their own rows after creating them.
  customerCan: z.array(z.enum(['update', 'delete'])).default([]),
  // customer access: everyone, including visitors, can read (reviews, testimonials).
  publicRead: z.boolean().default(false),
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

const CommerceSchema = z.object({
  product: ident(28),
  price: ident(28),
  stock: ident(28).optional(),
  // Boolean field: unavailable products are hidden from the shop and cannot be ordered.
  active: ident(28).optional(),
  payments: z.array(z.enum(PAYMENT_METHODS)).min(1).default(['cash']),
  delivery: z.object({
    fee: z.number().min(0).default(0),
    freeFrom: z.number().min(0).optional()
  }).strict().prefault({}),
  // Extra checkout questions stored on the order (delivery date, gift message, engraving…).
  orderFields: z.array(FieldSchema).default([])
}).strict()

const SectionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('entity'), entity: z.string(), title: z.string().optional(), limit: z.number().int().min(1).max(24).default(8) }).strict(),
  z.object({ type: z.literal('text'), title: z.string(), body: z.string() }).strict(),
  z.object({ type: z.literal('form'), entity: z.string(), title: z.string().optional(), description: z.string().optional() }).strict()
])

const SiteSchema = z.object({
  hero: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    cta: z.object({ label: z.string(), to: z.string() }).strict().optional()
  }).strict().optional(),
  sections: z.array(SectionSchema).default([]),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    hours: z.string().optional(),
    telegram: z.string().optional(),
    instagram: z.string().optional()
  }).strict().prefault({})
}).strict()

export const SpecSchema = z.object({
  app: z.object({
    name: z.string().min(1).max(60),
    slug: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
    description: z.string().default(''),
    type: z.enum(APP_TYPES).default('team'),
    color: z.enum(COLORS).default('indigo'),
    appId: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/, 'reverse-domain id such as com.acme.shop').optional(),
    currency: z.string().length(3).default('USD'),
    locale: z.string().default('en-US')
  }).strict(),
  entities: z.array(EntitySchema).min(1),
  commerce: CommerceSchema.optional(),
  site: SiteSchema.optional(),
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
  // Rows are only created by a database function (orders come from checkout), never inserted by an app.
  createdByFunction: boolean
}
export type Card = NonNullable<Spec['dashboard']>[number]
export type Commerce = NonNullable<Spec['commerce']>
export type Site = NonNullable<Spec['site']>
export interface NormalizedSpec {
  app: Spec['app'] & { appId: string, publicProfiles: boolean, publicSite: boolean }
  entities: Entity[]
  commerce?: Commerce
  site?: Site
  dashboard: Card[]
}

export class SpecError extends Error {
  constructor(public issues: string[]) {
    super(`Invalid app spec:\n${issues.map(i => `  - ${i}`).join('\n')}`)
  }
}

export const humanize = (s: string) => s.replace(/_id$/, '').split('_').map((w, i) => i === 0 ? w[0]!.toUpperCase() + w.slice(1) : w).join(' ')
const pluralize = (s: string) => /[^aeiou]y$/.test(s) ? `${s.slice(0, -1)}ies` : /(s|x|z|ch|sh)$/.test(s) ? `${s}es` : `${s}s`
const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function loadSpec(file: string): NormalizedSpec {
  return normalizeSpec(parse(readFileSync(file, 'utf8')))
}

// Order tables added by the commerce block. Their shape is fixed so checkout, stock and payments are always correct.
function commerceEntities(c: Commerce): RawEntity[] {
  const ro = (f: Partial<RawField> & { name: string, type: FieldType }): RawField => ({
    required: false, unique: false, cascade: false, staff: false, readonly: true, auto: false, ...f
  })
  const base = { icon: 'i-lucide-shopping-bag', access: 'customer' as const, own: [], customerCan: [], publicRead: false, attachments: false, realtime: true, nav: true }
  return [
    {
      ...base,
      name: 'shop_order',
      label: 'Order',
      plural: 'Orders',
      title: 'number',
      permissions: { read: 'viewer', create: 'owner', update: 'member', delete: 'admin' },
      sort: { field: 'created_at', dir: 'desc' },
      fields: [
        ro({ name: 'number', type: 'integer', label: 'Order #', required: true }),
        ro({ name: 'status', type: 'enum', options: ['new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'], default: 'new', required: true, readonly: false, staff: true }),
        ro({ name: 'payment_method', type: 'enum', options: [...c.payments], label: 'Payment', required: true }),
        ro({ name: 'payment_status', type: 'enum', options: ['unpaid', 'paid', 'refunded'], default: 'unpaid', required: true, readonly: false, staff: true, label: 'Paid' }),
        ro({ name: 'total', type: 'money', required: true }),
        ro({ name: 'customer_name', type: 'text', label: 'Customer', required: true }),
        ro({ name: 'phone', type: 'phone', required: true }),
        ro({ name: 'address', type: 'longtext', required: true, list: false }),
        ...c.orderFields.map(f => ({ ...f, readonly: true })),
        ro({ name: 'note', type: 'longtext', list: false }),
        ro({ name: 'subtotal', type: 'money', required: true, list: false }),
        ro({ name: 'delivery_fee', type: 'money', required: true, list: false })
      ]
    },
    {
      ...base,
      name: 'shop_order_item',
      label: 'Order item',
      plural: 'Order items',
      icon: 'i-lucide-package',
      title: 'title',
      nav: false,
      realtime: false,
      permissions: { read: 'viewer', create: 'owner', update: 'owner', delete: 'owner' },
      sort: { field: 'created_at', dir: 'asc' },
      fields: [
        ro({ name: 'order_id', type: 'relation', to: 'shop_order', required: true, cascade: true, label: 'Order' }),
        ro({ name: 'product_id', type: 'relation', to: c.product, label: 'Product', list: false }),
        ro({ name: 'title', type: 'text', required: true, label: 'Item' }),
        ro({ name: 'unit_price', type: 'money', required: true, label: 'Price' }),
        ro({ name: 'quantity', type: 'integer', required: true, min: 1 }),
        ro({ name: 'line_total', type: 'money', required: true, label: 'Total' })
      ]
    }
  ]
}

export function normalizeSpec(input: unknown): NormalizedSpec {
  const parsed = SpecSchema.safeParse(input)
  if (!parsed.success) {
    throw new SpecError(parsed.error.issues.map(i => `${i.path.join('.') || '(root)'}: ${i.message}`))
  }
  const spec = parsed.data
  const type = spec.app.type
  const issues: string[] = []
  const shopTypes = type === 'business' || type === 'marketplace'

  if (spec.commerce && !shopTypes) issues.push('commerce: shops need app.type business (one shop) or marketplace (many sellers)')
  if (spec.site && !shopTypes) issues.push('site: public websites need app.type business or marketplace')
  for (const e of spec.entities) {
    if ((e.access === 'customer' || e.access === 'inbox') && !shopTypes) {
      issues.push(`entities.${e.name}: access ${e.access} needs app.type business or marketplace (someone has to receive it)`)
    }
    if (e.access === 'members' && type === 'team') issues.push(`entities.${e.name}: access members is for personal or community apps; team apps share data with access team`)
  }

  const userEntities = spec.entities.map(e => ({ ...e, createdByFunction: false }))
  const allEntities = spec.commerce
    ? [...userEntities, ...commerceEntities(spec.commerce).map(e => ({ ...e, createdByFunction: true }))]
    : userEntities
  const names = new Set(allEntities.map(e => e.name))
  const slugs = new Set<string>()

  const entities: Entity[] = allEntities.map((e) => {
    const where = `entities.${e.name}`
    const builtIn = e.createdByFunction
    if (!builtIn && PG_RESERVED.has(e.name)) issues.push(`${where}: "${e.name}" is a SQL reserved word, pick another name (e.g. sales_${e.name})`)
    if (!builtIn && CORE_TABLES.has(e.name)) issues.push(`${where}: "${e.name}" is used by the core schema`)
    const entityLabel = e.label ?? humanize(e.name)
    const plural = e.plural ?? pluralize(entityLabel)
    const slug = kebab(plural)
    if (!builtIn && RESERVED_SLUGS.has(slug)) issues.push(`${where}: route "/${slug}" is reserved, set a different plural`)
    if (slugs.has(slug)) issues.push(`${where}: route "/${slug}" is used twice`)
    slugs.add(slug)
    if (e.publicRead && e.access !== 'customer') issues.push(`${where}: publicRead only applies to access customer (use access public instead)`)
    if (e.customerCan.length && e.access !== 'customer') issues.push(`${where}: customerCan only applies to access customer`)
    if (e.own.length && e.access !== 'team') issues.push(`${where}: own only applies to access team`)

    // Public entities with files get a cover image the shop and site show in cards.
    const rawFields = e.access === 'public' && e.attachments
      ? [...e.fields, { name: 'cover_url', type: 'url' as const, label: 'Cover image', required: false, unique: false, cascade: false, list: false, staff: true, readonly: false, auto: true }]
      : e.fields

    const fieldNames = new Set<string>()
    const fields: Field[] = rawFields.map((f) => {
      const fw = `${where}.fields.${f.name}`
      if (fieldNames.has(f.name)) issues.push(`${fw}: duplicate field`)
      fieldNames.add(f.name)
      if (!builtIn && SYSTEM_FIELDS.has(f.name) && !f.auto) issues.push(`${fw}: "${f.name}" is added automatically`)
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
      if (f.unique && ['boolean', 'json', 'tags', 'longtext'].includes(f.type)) issues.push(`${fw}: ${f.type} fields cannot be unique`)
      if (f.staff && f.readonly) issues.push(`${fw}: a field is either staff or readonly, not both`)
      if (!builtIn && f.readonly && f.required && f.default === undefined) issues.push(`${fw}: a readonly required field needs a default (only database functions can set it)`)
      if (f.default !== undefined) {
        const d = f.default
        const ok = f.type === 'boolean' ? typeof d === 'boolean'
          : ['integer', 'number', 'money', 'percent'].includes(f.type) ? typeof d === 'number'
            : ['date', 'datetime'].includes(f.type) ? d === 'now'
              : f.type === 'user' ? d === 'me'
                : !['relation', 'tags', 'json'].includes(f.type) && typeof d === 'string'
        if (!ok) issues.push(`${fw}: invalid default for ${f.type} (booleans take true/false, numbers a number, dates "now", user fields "me")`)
      }
      const isRef = f.type === 'relation' || f.type === 'user'
      return {
        ...f,
        label: f.label ?? humanize(f.name),
        list: f.list ?? (!['longtext', 'json'].includes(f.type) && !f.auto),
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

  const byName = new Map(entities.map(e => [e.name, e]))
  for (const e of entities) {
    for (const f of e.fields) {
      if (f.type === 'relation' && f.to && byName.has(f.to)) byName.get(f.to)!.children.push({ entity: e.name, field: f.name })
      // Data visible to visitors must not point at data only staff may see, or pages would show broken links.
      const target = f.type === 'relation' ? byName.get(f.to!) : undefined
      if (target && e.access === 'public' && !['public'].includes(target.access)) {
        issues.push(`entities.${e.name}.fields.${f.name}: public entities may only link to other public entities ("${target.name}" is ${target.access})`)
      }
      if (f.type === 'user' && (e.access === 'public' || e.access === 'inbox')) {
        issues.push(`entities.${e.name}.fields.${f.name}: user fields are not allowed on ${e.access} entities (visitors cannot see people)`)
      }
    }
  }
  try { insertionOrder(entities, true) } catch (err) { issues.push((err as Error).message) }

  // A marketplace has many sellers, so a submission must say which one it is for.
  if (type === 'marketplace') {
    for (const e of entities.filter(x => (x.access === 'customer' || x.access === 'inbox') && !x.createdByFunction)) {
      const linked = e.fields.some(f => f.type === 'relation' && f.required && byName.get(f.to!)?.access === 'public')
      if (!linked) issues.push(`entities.${e.name}: in a marketplace it needs a required relation to a public entity, so it reaches the right seller`)
    }
  }

  // Commerce: the product entity must be a public catalog with a money price.
  const commerce = spec.commerce
  if (commerce) {
    const product = byName.get(commerce.product)
    if (!product) issues.push(`commerce.product: unknown entity "${commerce.product}"`)
    else {
      if (product.access !== 'public') issues.push(`commerce.product: "${product.name}" needs access public so visitors can browse it`)
      const check = (key: 'price' | 'stock' | 'active', types: FieldType[], hint: string) => {
        const name = commerce[key]
        if (!name) return
        const f = product.fields.find(x => x.name === name)
        if (!f || !types.includes(f.type)) issues.push(`commerce.${key}: "${name}" must be ${hint} field of ${product.name}`)
        else if (key === 'price' && !f.required) issues.push(`commerce.price: "${name}" must be required`)
        else if (key === 'stock' && (!f.required || f.default === undefined)) issues.push(`commerce.stock: "${name}" must be required with a default (e.g. default: 0)`)
      }
      check('price', ['money'], 'a money')
      check('stock', ['integer'], 'an integer')
      check('active', ['boolean'], 'a boolean')
      const titleField = product.fields.find(f => f.name === product.title)
      if (titleField?.type !== 'text') issues.push(`commerce.product: the title of "${product.name}" must be a text field (it is copied onto orders)`)
    }
    for (const f of commerce.orderFields) {
      if (['relation', 'user'].includes(f.type)) issues.push(`commerce.orderFields.${f.name}: checkout questions cannot be relations`)
    }
  }

  const site = spec.site
  site?.sections.forEach((s, i) => {
    if (s.type === 'text') return
    const e = byName.get(s.entity)
    if (!e) return issues.push(`site.sections[${i}]: unknown entity "${s.entity}"`)
    if (s.type === 'entity' && e.access !== 'public' && !e.publicRead) issues.push(`site.sections[${i}]: "${e.name}" is not public, visitors cannot see it`)
    if (s.type === 'form' && e.access !== 'inbox' && e.access !== 'customer') issues.push(`site.sections[${i}]: forms need an entity with access inbox or customer`)
  })

  const defaultCards = (): Card[] => {
    if (spec.commerce) {
      return [
        { type: 'count', entity: 'shop_order', label: 'New orders', where: { status: 'new' }, icon: 'i-lucide-shopping-bag' },
        { type: 'sum', entity: 'shop_order', field: 'total', label: 'Revenue (paid)', where: { payment_status: 'paid' }, icon: 'i-lucide-banknote' },
        { type: 'count', entity: commerce!.product, icon: byName.get(commerce!.product)?.icon },
        { type: 'breakdown', entity: 'shop_order', field: 'status', label: 'Orders by status' }
      ]
    }
    return entities.filter(e => e.nav).slice(0, 4).map(e => ({ type: 'count' as const, entity: e.name, icon: e.icon }))
  }
  const dashboard: Card[] = spec.dashboard ?? defaultCards()
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

  if (type === 'personal') {
    for (const e of entities) {
      if (e.fields.some(f => f.type === 'user') && !entities.some(x => x.access === 'members')) {
        issues.push(`entities.${e.name}: user fields need other people to be visible; add an entity with access members or drop the field`)
      }
    }
  }

  if (issues.length) throw new SpecError(issues)
  const appId = spec.app.appId ?? `com.example.${spec.app.slug.replace(/-/g, '')}`
  // Shared content shows its author, so names must be readable by the people who can see that content.
  const publicProfiles = entities.some(e => e.access === 'members')
  return { app: { ...spec.app, appId, publicProfiles, publicSite: shopTypes }, entities, commerce, site, dashboard }
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
