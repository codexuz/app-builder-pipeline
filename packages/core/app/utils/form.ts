// Converts between database rows, form state and validated payloads for any entity.
import * as z from 'zod'
import type { EntityMeta, FieldMeta } from '#core/utils/meta'

const TEXT_MAX: Record<string, number> = { text: 500, longtext: 20000, email: 320, phone: 40, url: 2000 }
const blankToNull = (v: unknown) => (v === '' || v === undefined ? null : v)

function fieldSchema(f: FieldMeta): z.ZodType {
  const req = t('v.required', { label: tl(f.label) })
  let s: z.ZodType
  switch (f.type) {
    case 'text':
    case 'longtext':
    case 'phone': {
      let str = z.string().trim().max(f.max ?? TEXT_MAX[f.type]!)
      if (f.required) str = str.min(1, req)
      s = str
      break
    }
    case 'email': s = z.email(t('v.email')).max(320); break
    case 'url': s = z.string().regex(/^https?:\/\/\S+$/i, t('v.url')).max(2000); break
    case 'integer':
    case 'number':
    case 'money':
    case 'percent': {
      let n = f.type === 'integer' ? z.number({ error: req }).int(t('v.whole')) : z.number({ error: req })
      const min = f.min ?? (f.type === 'percent' ? 0 : undefined)
      const max = f.max ?? (f.type === 'percent' ? 100 : undefined)
      if (min !== undefined) n = n.min(min, t('v.min', { n: min }))
      if (max !== undefined) n = n.max(max, t('v.max', { n: max }))
      s = n
      break
    }
    case 'boolean': return z.boolean()
    case 'date': s = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('v.date')); break
    case 'datetime': s = z.string().min(1, req); break
    case 'enum': s = z.enum(f.options as [string, ...string[]], { error: req }); break
    case 'tags': return z.array(z.string().trim().min(1)).default([])
    case 'json': s = z.string().refine((v) => { try { JSON.parse(v); return true } catch { return false } }, t('v.json')); break
    case 'relation':
    case 'user': s = z.string({ error: req }).min(1, req); break
  }
  return f.required
    ? z.preprocess(blankToNull, s.nullable().refine(v => v !== null, req))
    : z.preprocess(blankToNull, s.nullable())
}

export const formSchema = (e: EntityMeta, fields: FieldMeta[] = e.fields.filter(f => !f.readonly && !f.auto)) =>
  z.object(Object.fromEntries(fields.map(f => [f.name, fieldSchema(f)])))

const pad = (n: number) => String(n).padStart(2, '0')
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Initial state for a new record: spec defaults, then values passed in (e.g. ?company_id= from a related list).
export function newFormState(e: EntityMeta, userId: string | undefined, preset: Record<string, unknown> = {}) {
  const state: Record<string, unknown> = {}
  for (const f of e.fields) {
    let v: unknown = f.type === 'boolean' ? false : f.type === 'tags' ? [] : undefined
    if (f.default === 'now') v = f.type === 'date' ? today() : toLocalInput(new Date().toISOString())
    else if (f.default === 'me') v = userId
    else if (f.default !== undefined) v = f.default
    if (preset[f.name] !== undefined) v = preset[f.name]
    state[f.name] = v
  }
  return state
}

export function rowToFormState(e: EntityMeta, row: Record<string, unknown>) {
  const state: Record<string, unknown> = {}
  for (const f of e.fields) {
    const v = row[f.name]
    if (f.type === 'datetime' && typeof v === 'string') state[f.name] = toLocalInput(v)
    else if (f.type === 'json') state[f.name] = v === null || v === undefined ? '' : JSON.stringify(v, null, 2)
    else if (f.type === 'tags') state[f.name] = v ?? []
    else state[f.name] = v ?? undefined
  }
  return state
}

export function formStateToPayload(e: EntityMeta, state: Record<string, unknown>, fields: FieldMeta[] = e.fields.filter(f => !f.readonly && !f.auto)) {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    let v = blankToNull(state[f.name])
    if (typeof v === 'string' && ['text', 'longtext', 'email', 'phone', 'url'].includes(f.type)) v = v.trim() || null
    if (f.type === 'datetime' && typeof v === 'string') v = new Date(v).toISOString()
    if (f.type === 'json' && typeof v === 'string') v = JSON.parse(v)
    if (f.type === 'tags') v = (v as string[] | null) ?? []
    out[f.name] = v
  }
  return out
}

// Postgres/PostgREST errors in words a user can act on.
export function friendlyError(err: unknown, e?: EntityMeta): string {
  const { code, message = '', details = '' } = (err ?? {}) as { code?: string, message?: string, details?: string }
  if (code === '23505') {
    const field = e?.fields.find(f => message.includes(`${e.name}_${f.name}_key`))
    return field ? t('e.unique', { field: tl(field.label) }) : t('e.exists')
  }
  if (code === '23503') {
    return /still referenced/.test(`${message} ${details}`)
      ? t('e.linked')
      : message
  }
  if (code === '42501' || /row-level security/.test(message)) return t('e.denied')
  if (code === '23514') return t('e.value')
  if (code === 'P0001' || code === 'P0002') return message
  if (/Failed to fetch|NetworkError/i.test(message)) return t('e.offline')
  return message || t('e.generic')
}
