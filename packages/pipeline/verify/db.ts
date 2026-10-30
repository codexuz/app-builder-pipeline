// Applies an app's migrations to in-process Postgres (PGlite) and proves the access rules hold:
// tenants are isolated, roles are enforced, references cannot cross workspaces, audit and dashboard work.
import { PGlite, type Transaction } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { insertionOrder, ROLES, type Entity, type Field, type NormalizedSpec, type Role } from '../spec.ts'

const STUB = readFileSync(fileURLToPath(new URL('./supabase-stub.sql', import.meta.url)), 'utf8')

interface User { id: string, email: string }
export interface CheckResult { name: string, ok: boolean, detail?: string }

const rank = (r: Role) => ROLES.indexOf(r)

export async function verifyDb(spec: NormalizedSpec, migrations: { name: string, sql: string }[]): Promise<CheckResult[]> {
  const db = new PGlite()
  const results: CheckResult[] = []
  const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail: ok ? undefined : detail })

  await db.exec(STUB)
  for (const m of migrations) {
    try {
      await db.exec(m.sql)
      check(`migration ${m.name} applies`, true)
    } catch (err) {
      check(`migration ${m.name} applies`, false, (err as Error).message)
      await db.close()
      return results
    }
  }

  const signUp = async (name: string): Promise<User> => {
    const email = `${name}@example.com`
    const { rows } = await db.query<{ id: string }>(
      `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
      [email, { full_name: name[0]!.toUpperCase() + name.slice(1) }]
    )
    return { id: rows[0]!.id, email }
  }

  // Runs fn as a signed-in user, exactly like a request through PostgREST with that user's JWT.
  const as = async <T>(user: User, fn: (tx: Transaction) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)`,
        [user.id, JSON.stringify({ sub: user.id, email: user.email, role: 'authenticated' })])
      await tx.exec('set local role authenticated')
      return fn(tx)
    })
  const fails = async (user: User, fn: (tx: Transaction) => Promise<unknown>) => {
    try { await as(user, fn); return false } catch { return true }
  }
  const count = async (user: User, sql: string, params: unknown[] = []) =>
    as(user, async tx => (await tx.query(sql, params)).rows.length)

  const alice = await signUp('alice')
  const bob = await signUp('bob')
  const userTenancy = spec.app.tenancy === 'user'
  let orgA: string, orgB: string
  let carol: User | undefined, dave: User | undefined

  if (userTenancy) {
    const personal = async (u: User) => (await db.query<{ org_id: string }>(
      `select org_id from public.memberships m join public.organizations o on o.id = m.org_id where m.user_id = $1 and o.personal and m.role = 'owner'`,
      [u.id])).rows[0]?.org_id
    orgA = (await personal(alice))!
    orgB = (await personal(bob))!
    check('sign-up creates a private workspace', Boolean(orgA && orgB && orgA !== orgB), 'no personal workspace after sign-up')
  } else {
    const createOrg = (u: User, name: string) => as(u, async tx =>
      (await tx.query<{ id: string }>(`select public.create_organization($1) as id`, [name])).rows[0]!.id)
    orgA = await createOrg(alice, 'Alice Co')
    orgB = await createOrg(bob, 'Bob Co')
    carol = await signUp('carol')
    dave = await signUp('dave')
    const invite = (email: string, role: Role) => as(alice, async tx =>
      (await tx.query<{ token: string }>(`insert into public.invitations (org_id, email, role) values ($1, $2, $3) returning token`, [orgA, email, role])).rows[0]!.token)
    const carolToken = await invite(carol.email, 'viewer')
    const daveToken = await invite(dave.email, 'member')
    check('invitation is bound to its email', await fails(carol, tx => tx.query(`select public.accept_invitation($1)`, [daveToken])), 'carol accepted an invite sent to dave')
    await as(carol, tx => tx.query(`select public.accept_invitation($1)`, [carolToken]))
    await as(dave, tx => tx.query(`select public.accept_invitation($1)`, [daveToken]))
    check('invitation cannot be reused', await fails(carol, tx => tx.query(`select public.accept_invitation($1)`, [carolToken])), 'token accepted twice')
    check('members cannot invite', await fails(dave, tx => tx.query(`insert into public.invitations (org_id, email) values ($1, 'x@example.com')`, [orgA])), 'a member created an invitation')
    check('admins cannot be removed below one owner', await fails(alice, tx => tx.query(`delete from public.memberships where org_id = $1 and user_id = $2`, [orgA, alice.id])), 'last owner left the organization')
    check('workspaces are invisible to outsiders', (await count(bob, `select 1 from public.organizations where id = $1`, [orgA])) === 0, 'bob sees alice\'s organization')
    check('member list is invisible to outsiders', (await count(bob, `select 1 from public.memberships where org_id = $1`, [orgA])) === 0, 'bob sees alice\'s members')
  }
  check('profiles follow the visibility rules', (await count(bob, `select 1 from public.profiles where id = $1`, [alice.id])) === (spec.app.publicProfiles ? 1 : 0),
    spec.app.publicProfiles ? 'public profile not readable' : 'bob reads a stranger\'s profile')

  // One sample record per entity and workspace, parents first.
  const ordered = insertionOrder(spec.entities)
  const byName = new Map(spec.entities.map(e => [e.name, e]))
  const samples: Record<string, Record<string, string>> = { [orgA]: {}, [orgB]: {} }
  const owners: Record<string, User> = { [orgA]: alice, [orgB]: bob }

  const sampleRow = (e: Entity, org: string, n: number) => {
    const row: Record<string, unknown> = { org_id: org }
    for (const f of e.fields) {
      const v = sampleValue(f, n, owners[org]!.id, f.type === 'relation' ? samples[org]![f.to!] : undefined)
      if (v !== undefined) row[f.name] = v
    }
    return row
  }
  const insert = (tx: Transaction, e: Entity, row: Record<string, unknown>) => tx.query<{ id: string }>(
    `insert into public.${e.name} (${Object.keys(row).join(', ')})
     select ${Object.keys(row).join(', ')} from jsonb_populate_record(null::public.${e.name}, $1::jsonb) returning id`,
    [JSON.stringify(row)])

  for (const e of ordered) {
    for (const org of [orgA, orgB]) {
      try {
        const id = await as(owners[org]!, async tx => (await insert(tx, e, sampleRow(e, org, 1))).rows[0]!.id)
        samples[org]![e.name] = id
      } catch (err) {
        check(`${e.name}: owner can create a record`, false, (err as Error).message)
      }
    }
    const id = samples[orgA]![e.name]
    if (!id || !samples[orgB]![e.name]) continue
    check(`${e.name}: owner can create a record`, true)

    const t = `public.${e.name}`
    const canRead = (u: User) => count(u, `select 1 from ${t} where id = $1`, [id])
    const canUpdate = (u: User, rid = id) => count(u, `update ${t} set updated_at = now() where id = $1 returning id`, [rid])
    const canDelete = (u: User, rid: string) => count(u, `delete from ${t} where id = $1 returning id`, [rid])
    const fresh = async () => as(alice, async tx => (await insert(tx, e, sampleRow(e, orgA, 2))).rows[0]!.id)

    if (e.visibility === 'public') check(`${e.name}: public records are readable by other users`, (await canRead(bob)) === 1, 'bob cannot read a public record')
    else check(`${e.name}: hidden from other workspaces`, (await canRead(bob)) === 0, 'bob can read alice\'s record')
    check(`${e.name}: other workspaces cannot update`, (await canUpdate(bob)) === 0, 'bob updated alice\'s record')
    check(`${e.name}: other workspaces cannot delete`, (await canDelete(bob, id)) === 0, 'bob deleted alice\'s record')
    check(`${e.name}: cannot insert into another workspace`, await fails(bob, tx => insert(tx, e, sampleRow(e, orgA, 3))), 'bob inserted into alice\'s workspace')
    check(`${e.name}: workspace cannot be changed on update`, await fails(alice, tx => tx.query(`update ${t} set org_id = $1 where id = $2`, [orgB, id])), 'record moved between workspaces')

    for (const f of e.fields.filter(f => f.type === 'relation' && byName.get(f.to!)!.visibility !== 'public')) {
      const foreign = samples[orgA]![f.to!]
      if (!foreign) continue
      const row = { ...sampleRow(e, orgB, 4), [f.name]: foreign }
      check(`${e.name}.${f.name}: cannot link to another workspace's ${f.to}`, await fails(bob, tx => insert(tx, e, row)), 'cross-workspace reference accepted')
    }

    if (carol && dave) {
      const p = e.permissions
      const mineOnly = e.visibility === 'own'
      const expectRead = rank(p.read) <= rank('viewer') && !mineOnly
      check(`${e.name}: viewer read access is ${expectRead ? 'allowed' : 'denied'}`, (await canRead(carol)) === (expectRead ? 1 : 0), `viewer read did not match permissions.read=${p.read}`)
      const viewerCreates = !(await fails(carol, tx => insert(tx, e, sampleRow(e, orgA, 5))))
      check(`${e.name}: viewer create is ${p.create === 'viewer' ? 'allowed' : 'denied'}`, viewerCreates === (p.create === 'viewer'), `permissions.create=${p.create}`)
      const expectUpdate = rank(p.update) <= rank('member') && !e.own.includes('update') && !mineOnly
      check(`${e.name}: member update of others' records is ${expectUpdate ? 'allowed' : 'denied'}`, (await canUpdate(dave)) === (expectUpdate ? 1 : 0), `permissions.update=${p.update}, own=${e.own.join(',')}`)
      const expectDelete = rank(p.delete) <= rank('member') && !e.own.includes('delete') && !mineOnly
      const victim = await fresh()
      check(`${e.name}: member delete of others' records is ${expectDelete ? 'allowed' : 'denied'}`, (await canDelete(dave, victim)) === (expectDelete ? 1 : 0), `permissions.delete=${p.delete}, own=${e.own.join(',')}`)
      if (rank(p.create) <= rank('member') && rank(p.update) <= rank('member')) {
        const daveRow = await as(dave, async tx => (await insert(tx, e, { ...sampleRow(e, orgA, 6), created_by: alice.id })).rows[0]!.id)
        const { rows } = await db.query<{ created_by: string }>(`select created_by from ${t} where id = $1`, [daveRow])
        check(`${e.name}: created_by cannot be forged`, rows[0]?.created_by === dave.id, 'created_by was taken from the client')
        check(`${e.name}: members can update their own records`, (await canUpdate(dave, daveRow)) === 1, 'dave could not update his own record')
      }
    }

    const { rows: audit } = await db.query(`select 1 from public.audit_log where org_id = $1 and table_name = $2`, [orgA, e.name])
    check(`${e.name}: changes are written to the audit log`, audit.length > 0, 'no audit rows')
  }

  try {
    const stats = await as(alice, async tx => (await tx.query<{ s: Record<string, unknown> }>(`select public.dashboard_stats($1) as s`, [orgA])).rows[0]!.s)
    check('dashboard_stats returns every card', spec.dashboard.every((_, i) => `c${i}` in stats), JSON.stringify(stats))
    const leak = await as(bob, async tx => (await tx.query<{ s: Record<string, unknown> }>(`select public.dashboard_stats($1) as s`, [orgA])).rows[0]!.s)
    const nonzero = spec.dashboard.some((c, i) => {
      const v = leak[`c${i}`]
      const pub = byName.get(c.entity)!.visibility === 'public'
      return !pub && (typeof v === 'object' ? Object.keys(v as object).length > 0 : Number(v) > 0)
    })
    check('dashboard_stats does not leak other workspaces', !nonzero, JSON.stringify(leak))
  } catch (err) {
    check('dashboard_stats runs', false, (err as Error).message)
  }

  await db.close()
  return results
}

function sampleValue(f: Field, n: number, userId: string, relationId: string | undefined): unknown {
  const clamp = (v: number) => Math.min(f.max ?? v, Math.max(f.min ?? v, v))
  switch (f.type) {
    case 'text': return `${f.label} ${n}`.slice(0, f.max ?? 500)
    case 'longtext': return `Notes for ${f.label.toLowerCase()} ${n}`
    case 'email': return `contact${n}@example.com`
    case 'phone': return '+1 555 0100'
    case 'url': return 'https://example.com'
    case 'integer': return Math.round(clamp(n))
    case 'number':
    case 'money': return clamp(100 * n)
    case 'percent': return clamp(50)
    case 'boolean': return true
    case 'date': return '2025-01-15'
    case 'datetime': return '2025-01-15T10:00:00Z'
    case 'enum': return f.options![0]
    case 'tags': return ['alpha', 'beta']
    case 'json': return { sample: n }
    case 'relation': return relationId ?? (f.required ? '00000000-0000-0000-0000-000000000000' : undefined)
    case 'user': return userId
  }
}
