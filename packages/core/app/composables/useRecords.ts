import { commerce } from '#core/schema'
import { entityByName, fieldOf, isShared, selectFor, type EntityMeta, type Row } from '#core/utils/meta'

export interface ListOptions {
  page: number
  pageSize: number
  search?: string
  filters?: Record<string, unknown>
  sort?: { field: string, desc: boolean }
  // workspace: the current workspace (staff). all: everything RLS shows (catalogs, community).
  // mine: rows the signed-in person created (a customer's orders and bookings).
  scope?: 'workspace' | 'all' | 'mine'
}

// PostgREST filter syntax treats , ( ) as separators, so strip them from free text.
export const cleanSearch = (s: string) => s.replace(/[,()%*\\]/g, ' ').trim()

export function useRecords(e: EntityMeta) {
  const sb = useSupabase()
  const { current } = useWorkspace()
  const { user } = useAuth()
  const select = selectFor(e)

  const orgId = () => {
    if (!current.value) throw new Error('No workspace selected')
    return current.value.id
  }

  async function list(opts: ListOptions): Promise<{ rows: Row[], total: number }> {
    let q = sb.from(e.name).select(select, { count: 'exact' })
    const scope = opts.scope ?? 'workspace'
    if (scope === 'workspace' || (scope === 'all' && !isShared(e))) q = q.eq('org_id', orgId())
    if (scope === 'mine') q = q.eq('created_by', user.value?.id ?? '00000000-0000-0000-0000-000000000000')
    // The storefront never lists products the shop has switched off, even for its own staff.
    if (scope !== 'workspace' && commerce?.active && e.name === commerce.product) q = q.eq(commerce.active, true)
    for (const [k, v] of Object.entries(opts.filters ?? {})) {
      if (v === undefined || v === null || v === '') continue
      q = Array.isArray(v) ? q.in(k, v) : q.eq(k, v)
    }
    const term = opts.search ? cleanSearch(opts.search) : ''
    const searchable = e.fields.filter(f => f.search)
    if (term && searchable.length) q = q.or(searchable.map(f => `${f.name}.ilike.*${term}*`).join(','))
    const sort = opts.sort ?? { field: e.sort.field, desc: e.sort.dir === 'desc' }
    q = q.order(sort.field, { ascending: !sort.desc, nullsFirst: false })
    if (fieldOf(e, sort.field)) q = q.order('created_at', { ascending: false })
    const from = (opts.page - 1) * opts.pageSize
    const { data, error, count } = await q.range(from, from + opts.pageSize - 1)
    if (error) throw error
    return { rows: (data ?? []) as unknown as Row[], total: count ?? 0 }
  }

  async function get(id: string): Promise<Row | null> {
    const { data, error } = await sb.from(e.name).select(select).eq('id', id).maybeSingle()
    if (error) throw error
    return data as unknown as Row | null
  }

  // Staff create in their workspace; customers and visitors pass the shop's workspace (useShop).
  async function create(payload: Record<string, unknown>, org: string = orgId()): Promise<Row> {
    const { data, error } = await sb.from(e.name).insert({ ...payload, org_id: org }).select(select).single()
    if (error) throw error
    return data as unknown as Row
  }

  // Visitors cannot read back what they send (a contact form), so their inserts return nothing.
  async function submit(payload: Record<string, unknown>, org: string) {
    const { error } = await sb.from(e.name).insert({ ...payload, org_id: org })
    if (error) throw error
  }

  // RLS turns forbidden updates/deletes into "0 rows"; surface that as an error instead of silent success.
  async function update(id: string, payload: Record<string, unknown>): Promise<Row> {
    const { data, error } = await sb.from(e.name).update(payload).eq('id', id).select(select)
    if (error) throw error
    if (!data?.length) throw { code: '42501', message: 'not allowed' }
    return data[0] as unknown as Row
  }

  async function remove(id: string) {
    const { data, error } = await sb.from(e.name).delete().eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw { code: '42501', message: 'not allowed' }
  }

  // Live updates for lists; calls back on any change the list could show.
  function subscribe(onChange: () => void, scope: ListOptions['scope'] = 'workspace') {
    if (!e.realtime || import.meta.server) return () => {}
    const filter = scope === 'mine' ? `created_by=eq.${user.value?.id}`
      : scope === 'all' && isShared(e) ? undefined
        : `org_id=eq.${orgId()}`
    const channel = sb.channel(`${e.name}:${filter ?? 'all'}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: e.name, filter }, onChange)
      .subscribe()
    return () => { sb.removeChannel(channel) }
  }

  return { list, get, create, submit, update, remove, subscribe }
}

export const useRecordsByName = (name: string) => useRecords(entityByName(name)!)
