// Applies an app's migrations to in-process Postgres (PGlite) and proves the access rules hold for every
// kind of person: visitors, customers, staff of each role, and outsiders from other workspaces.
import { PGlite, type Transaction } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { insertionOrder, ROLES, type Entity, type Field, type NormalizedSpec, type Role } from '../spec.ts'

const STUB = readFileSync(fileURLToPath(new URL('./supabase-stub.sql', import.meta.url)), 'utf8')

interface User { id: string, email: string }
export interface CheckResult { name: string, ok: boolean, detail?: string }

const rank = (r: Role) => ROLES.indexOf(r)
const ANON: User = { id: '', email: '' }

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

  // Runs fn as a signed-in user (or a visitor), exactly like a request through PostgREST.
  const as = async <T>(user: User, fn: (tx: Transaction) => Promise<T>): Promise<T> =>
    db.transaction(async (tx) => {
      if (user === ANON) {
        await tx.exec('set local role anon')
      } else {
        await tx.query(`select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)`,
          [user.id, JSON.stringify({ sub: user.id, email: user.email, role: 'authenticated' })])
        await tx.exec('set local role authenticated')
      }
      return fn(tx)
    })
  const asVisitorFrom = (address: string, fn: (tx: Transaction) => Promise<unknown>) => db.transaction(async (tx) => {
    await tx.query(`select set_config('request.headers', $1, true)`, [JSON.stringify({ 'x-forwarded-for': address })])
    await tx.exec('set local role anon')
    return fn(tx)
  })
  const asService = <T>(fn: (tx: Transaction) => Promise<T>) => db.transaction(async (tx) => {
    await tx.exec('set local role service_role')
    return fn(tx)
  })
  const fails = async (user: User, fn: (tx: Transaction) => Promise<unknown>) => {
    try { await as(user, fn); return false } catch { return true }
  }
  const count = async (user: User, sql: string, params: unknown[] = []) =>
    as(user, async tx => (await tx.query(sql, params)).rows.length)
  const createOrg = (u: User, name: string) => as(u, async tx =>
    (await tx.query<{ id: string }>(`select public.create_organization($1) as id`, [name])).rows[0]!.id)

  const type = spec.app.type
  const alice = await signUp('alice')
  const bob = await signUp('bob')
  let carol: User | undefined
  let dave: User | undefined
  let orgA: string
  let orgB: string | undefined
  // Customers: people who use a business or marketplace without being its staff.
  let customer: User | undefined
  let otherCustomer: User | undefined

  const invite = async (email: string, role: Role, org: string) => as(alice, async tx =>
    (await tx.query<{ token: string }>(`insert into public.invitations (org_id, email, role) values ($1, $2, $3) returning token`, [org, email, role])).rows[0]!.token)
  const join = async (u: User, token: string) => as(u, tx => tx.query(`select public.accept_invitation($1)`, [token]))

  if (type === 'personal') {
    const personal = async (u: User) => (await db.query<{ org_id: string }>(
      `select org_id from public.memberships m join public.organizations o on o.id = m.org_id where m.user_id = $1 and o.personal and m.role = 'owner'`,
      [u.id])).rows[0]?.org_id
    orgA = (await personal(alice))!
    orgB = await personal(bob)
    check('sign-up creates a private workspace', Boolean(orgA && orgB && orgA !== orgB), 'no personal workspace after sign-up')
  } else {
    orgA = await createOrg(alice, 'Alice Co')
    carol = await signUp('carol')
    dave = await signUp('dave')
    if (type === 'business') {
      check('a business app has exactly one workspace', await fails(bob, tx => tx.query(`select public.create_organization('Second shop')`)), 'a second workspace was created')
      const { rows } = await db.query<{ id: string }>(`select public.business_org() as id`)
      check('business_org() points at the business workspace', rows[0]?.id === orgA, `got ${rows[0]?.id}`)
      customer = carol
      otherCustomer = bob
    } else {
      orgB = await createOrg(bob, 'Bob Co')
    }
    if (type === 'marketplace') {
      customer = carol
      otherCustomer = await signUp('erin')
    }
    // Staff: dave is a member; in team apps carol is a viewer.
    await join(dave, await invite(dave.email, 'member', orgA))
    if (type === 'team') {
      const carolToken = await invite(carol.email, 'viewer', orgA)
      const daveSecond = await invite('dave2@example.com', 'member', orgA)
      check('invitation is bound to its email', await fails(carol, tx => tx.query(`select public.accept_invitation($1)`, [daveSecond])), 'carol accepted an invite sent to someone else')
      await join(carol, carolToken)
      check('invitation cannot be reused', await fails(carol, tx => tx.query(`select public.accept_invitation($1)`, [carolToken])), 'token accepted twice')
    }
    check('members cannot invite', await fails(dave, tx => tx.query(`insert into public.invitations (org_id, email) values ($1, 'x@example.com')`, [orgA])), 'a member created an invitation')
    check('the last owner cannot leave', await fails(alice, tx => tx.query(`delete from public.memberships where org_id = $1 and user_id = $2`, [orgA, alice.id])), 'last owner left')
    check('member lists are invisible to outsiders', (await count(bob, `select 1 from public.memberships where org_id = $1`, [orgA])) === 0, 'bob sees alice\'s members')
    const orgVisible = await count(ANON, `select 1 from public.organizations where id = $1`, [orgA])
    check(`workspace names are ${spec.app.publicSite ? 'public' : 'private'}`, orgVisible === (spec.app.publicSite ? 1 : 0), `visitor saw ${orgVisible} rows`)
  }
  const outsider = type === 'business' ? bob : bob
  check('profiles follow the visibility rules', (await count(bob, `select 1 from public.profiles where id = $1`, [alice.id])) === (spec.app.publicProfiles ? 1 : 0),
    spec.app.publicProfiles ? 'profile not readable' : 'bob reads a stranger\'s profile')

  // Sample rows, parents first. Staff create staff data; customers create their own records.
  const ordered = insertionOrder(spec.entities).filter(e => !e.createdByFunction)
  const byName = new Map(spec.entities.map(e => [e.name, e]))
  const orgs = [orgA, ...(orgB ? [orgB] : [])]
  const samples: Record<string, Record<string, string>> = Object.fromEntries(orgs.map(o => [o, {}]))
  const ownerOf: Record<string, User> = { [orgA]: alice, ...(orgB ? { [orgB]: bob } : {}) }
  const creatorFor = (e: Entity, org: string): User => {
    if (e.access === 'customer') return customer!
    if (e.access === 'inbox') return ANON
    return ownerOf[org]!
  }

  const sampleRow = (e: Entity, org: string, n: number, who: User) => {
    const row: Record<string, unknown> = { org_id: org }
    for (const f of e.fields) {
      if (f.auto || f.readonly) continue
      const v = spec.scheduling?.entity === e.name && f.name === spec.scheduling.start
        ? slotOn(n)
        : sampleValue(f, n, who === ANON ? ownerOf[org]!.id : who.id, f.type === 'relation' ? samples[org]![f.to!] : undefined)
      if (v !== undefined && !(f.type === 'user' && (who === ANON || e.access === 'customer'))) row[f.name] = v
    }
    return row
  }
  const insert = (tx: Transaction, e: Entity, row: Record<string, unknown>) => tx.query<{ id: string }>(
    `insert into public.${e.name} (${Object.keys(row).join(', ')})
     select ${Object.keys(row).join(', ')} from jsonb_populate_record(null::public.${e.name}, $1::jsonb) returning id`,
    [JSON.stringify(row)])
  // Visitors cannot read back what they submit, so their inserts do not ask for the id.
  const insertBlind = (tx: Transaction, e: Entity, row: Record<string, unknown>) => tx.query(
    `insert into public.${e.name} (${Object.keys(row).join(', ')})
     select ${Object.keys(row).join(', ')} from jsonb_populate_record(null::public.${e.name}, $1::jsonb)`,
    [JSON.stringify(row)])

  for (const e of ordered) {
    for (const org of orgs) {
      if ((e.access === 'customer' || e.access === 'inbox') && org !== orgA) continue
      const who = creatorFor(e, org)
      try {
        if (who === ANON) {
          await as(ANON, tx => insertBlind(tx, e, sampleRow(e, org, 1, who)))
          const { rows } = await db.query<{ id: string }>(`select id from public.${e.name} where org_id = $1 order by created_at desc limit 1`, [org])
          samples[org]![e.name] = rows[0]!.id
        } else {
          samples[org]![e.name] = await as(who, async tx => (await insert(tx, e, sampleRow(e, org, 1, who))).rows[0]!.id)
        }
      } catch (err) {
        check(`${e.name}: ${who === ANON ? 'a visitor' : who === customer ? 'a customer' : 'the owner'} can create a record`, false, (err as Error).message)
      }
    }
    const id = samples[orgA]![e.name]
    if (!id) continue
    const t = `public.${e.name}`
    const canRead = (u: User, rid = id) => count(u, `select 1 from ${t} where id = $1`, [rid])
    const canUpdate = (u: User, rid = id) => count(u, `update ${t} set updated_at = now() where id = $1 returning id`, [rid])
    const canDelete = (u: User, rid: string) => count(u, `delete from ${t} where id = $1 returning id`, [rid])
    const fresh = async () => as(alice, async tx => (await insert(tx, e, sampleRow(e, orgA, 2, alice))).rows[0]!.id)
    check(`${e.name} (${e.access}): records can be created by the right people`, true)

    // Outsiders (another workspace's owner, or a stranger) never change this workspace's data.
    if (e.access !== 'customer' || type !== 'business') {
      check(`${e.name}: outsiders cannot update`, (await canUpdate(outsider)) === 0, 'an outsider updated the record')
      check(`${e.name}: outsiders cannot delete`, (await canDelete(outsider, id)) === 0, 'an outsider deleted the record')
    }
    if (['team', 'private', 'members', 'public'].includes(e.access)) {
      check(`${e.name}: outsiders cannot insert into this workspace`, await fails(outsider, tx => insert(tx, e, sampleRow(e, orgA, 3, outsider))), 'inserted into another workspace')
      check(`${e.name}: records cannot move between workspaces`, !orgB || await fails(alice, tx => tx.query(`update ${t} set org_id = $1 where id = $2`, [orgB, id])), 'record moved')
    }

    switch (e.access) {
      case 'team':
      case 'private':
        check(`${e.name}: hidden from other workspaces`, (await canRead(outsider)) === 0, 'outsider can read')
        check(`${e.name}: hidden from visitors`, (await canRead(ANON)) === 0, 'visitor can read')
        break
      case 'members':
        check(`${e.name}: readable by every signed-in user`, (await canRead(outsider)) === 1, 'another user cannot read it')
        check(`${e.name}: hidden from visitors`, (await canRead(ANON)) === 0, 'visitor can read')
        break
      case 'public':
        check(`${e.name}: readable by visitors`, (await canRead(ANON)) === 1, 'visitor cannot read')
        check(`${e.name}: visitors cannot insert`, await fails(ANON, tx => insertBlind(tx, e, sampleRow(e, orgA, 4, alice))), 'visitor inserted')
        check(`${e.name}: visitors cannot change records`, (await canUpdate(ANON)) === 0 && (await canDelete(ANON, id)) === 0, 'visitor changed a record')
        break
      case 'customer': {
        check(`${e.name}: customers see their own records`, (await canRead(customer!)) === 1, 'the customer cannot read their record')
        check(`${e.name}: staff see customer records`, (await canRead(alice)) === 1 && (await canRead(dave!)) === 1, 'staff cannot read it')
        check(`${e.name}: other customers ${e.publicRead ? 'can' : 'cannot'} see it`, (await canRead(otherCustomer!)) === (e.publicRead ? 1 : 0), 'wrong visibility for other customers')
        check(`${e.name}: visitors ${e.publicRead ? 'can' : 'cannot'} see it`, (await canRead(ANON)) === (e.publicRead ? 1 : 0), 'wrong visibility for visitors')
        check(`${e.name}: visitors cannot create records`, await fails(ANON, tx => insertBlind(tx, e, sampleRow(e, orgA, 5, customer!))), 'visitor created a customer record')
        const custUpdate = await canUpdate(customer!)
        check(`${e.name}: customers ${e.customerCan.includes('update') ? 'can' : 'cannot'} update their record`, custUpdate === (e.customerCan.includes('update') ? 1 : 0), `customerCan=${e.customerCan.join(',') || 'none'}`)
        check(`${e.name}: other customers cannot update it`, (await canUpdate(otherCustomer!)) === 0, 'another customer updated it')
        const own = await as(customer!, async tx => (await insert(tx, e, sampleRow(e, orgA, 7, customer!))).rows[0]!.id)
        check(`${e.name}: other customers cannot delete it`, (await canDelete(otherCustomer!, own)) === 0, 'another customer deleted it')
        const mayDelete = e.customerCan.includes('delete')
        check(`${e.name}: customers ${mayDelete ? 'can' : 'cannot'} delete their record`, (await canDelete(customer!, own)) === (mayDelete ? 1 : 0), `customerCan=${e.customerCan.join(',') || 'none'}`)
        if (orgB && !e.publicRead) check(`${e.name}: another seller cannot see it`, (await canRead(bob)) === 0, 'another seller reads it')
        break
      }
      case 'inbox':
        check(`${e.name}: visitors can submit`, true)
        check(`${e.name}: visitors cannot read submissions`, (await canRead(ANON)) === 0, 'visitor reads submissions')
        check(`${e.name}: staff read submissions`, (await canRead(dave!)) === 1, 'staff cannot read submissions')
        if (customer) check(`${e.name}: customers cannot read submissions`, (await canRead(customer)) === 0, 'customer reads submissions')
        break
    }

    // Staff-only fields: whatever a non-staff author sends is replaced by the default.
    for (const f of e.fields.filter(x => x.staff && !x.auto && (e.access === 'customer' || e.access === 'inbox'))) {
      const forged = forgedValue(f)
      if (forged === undefined) continue
      const author = e.access === 'inbox' ? ANON : customer!
      const row = { ...sampleRow(e, orgA, 6, author), [f.name]: forged }
      try {
        await as(author, tx => insertBlind(tx, e, row))
        const { rows } = await db.query<Record<string, unknown>>(`select ${f.name} as v from ${t} order by created_at desc limit 1`)
        check(`${e.name}.${f.name}: only staff can set it`, JSON.stringify(rows[0]?.v) !== JSON.stringify(forged), `a non-staff author set ${f.name}`)
      } catch (err) {
        check(`${e.name}.${f.name}: only staff can set it`, false, (err as Error).message)
      }
    }

    for (const f of e.fields.filter(x => x.type === 'relation' && !['public', 'members'].includes(byName.get(x.to!)!.access))) {
      const foreign = samples[orgA]![f.to!]
      if (!foreign || !orgB || e.access === 'customer' || e.access === 'inbox') continue
      const row = { ...sampleRow(e, orgB, 4, bob), [f.name]: foreign }
      check(`${e.name}.${f.name}: cannot link to another workspace's ${f.to}`, await fails(bob, tx => insert(tx, e, row)), 'cross-workspace reference accepted')
    }

    // Role permissions for team data, checked with a viewer (team apps) and a member.
    if (e.access === 'team' || e.access === 'private') {
      const p = e.permissions
      const mineOnly = e.access === 'private'
      if (carol && type === 'team') {
        const expectRead = rank(p.read) <= rank('viewer') && !mineOnly
        check(`${e.name}: viewer read access is ${expectRead ? 'allowed' : 'denied'}`, (await canRead(carol)) === (expectRead ? 1 : 0), `permissions.read=${p.read}`)
        const viewerCreates = !(await fails(carol, tx => insert(tx, e, sampleRow(e, orgA, 5, carol!))))
        check(`${e.name}: viewer create is ${p.create === 'viewer' ? 'allowed' : 'denied'}`, viewerCreates === (p.create === 'viewer'), `permissions.create=${p.create}`)
      }
      if (dave) {
        const expectUpdate = rank(p.update) <= rank('member') && !e.own.includes('update') && !mineOnly
        check(`${e.name}: member update of others' records is ${expectUpdate ? 'allowed' : 'denied'}`, (await canUpdate(dave)) === (expectUpdate ? 1 : 0), `permissions.update=${p.update}, own=${e.own.join(',')}`)
        const expectDelete = rank(p.delete) <= rank('member') && !e.own.includes('delete') && !mineOnly
        const victim = await fresh()
        check(`${e.name}: member delete of others' records is ${expectDelete ? 'allowed' : 'denied'}`, (await canDelete(dave, victim)) === (expectDelete ? 1 : 0), `permissions.delete=${p.delete}`)
        if (rank(p.create) <= rank('member') && rank(p.update) <= rank('member')) {
          const daveRow = await as(dave, async tx => (await insert(tx, e, { ...sampleRow(e, orgA, 6, dave!), created_by: alice.id })).rows[0]!.id)
          const { rows } = await db.query<{ created_by: string }>(`select created_by from ${t} where id = $1`, [daveRow])
          check(`${e.name}: created_by cannot be forged`, rows[0]?.created_by === dave.id, 'created_by was taken from the client')
          check(`${e.name}: members can update their own records`, (await canUpdate(dave, daveRow)) === 1, 'dave could not update his own record')
        }
      }
    }

    const { rows: audit } = await db.query(`select 1 from public.audit_log where org_id = $1 and table_name = $2`, [orgA, e.name])
    check(`${e.name}: changes are written to the audit log`, audit.length > 0, 'no audit rows')
  }

  if (spec.commerce) await verifyCommerce()
  if (spec.scheduling) await verifyScheduling()
  for (const e of spec.entities.filter(x => x.access === 'inbox')) await verifySpamLimit(e)

  try {
    const stats = await as(alice, async tx => (await tx.query<{ s: Record<string, unknown> }>(`select public.dashboard_stats($1) as s`, [orgA])).rows[0]!.s)
    check('dashboard_stats returns every card', spec.dashboard.every((_, i) => `c${i}` in stats), JSON.stringify(stats))
    // A newcomer with no records of their own sees zeros; RLS applies inside the function.
    const stranger = await signUp('stranger')
    const leak = await as(stranger, async tx => (await tx.query<{ s: Record<string, unknown> }>(`select public.dashboard_stats($1) as s`, [orgA])).rows[0]!.s)
    const nonzero = spec.dashboard.some((c, i) => {
      const v = leak[`c${i}`]
      const ent = byName.get(c.entity)!
      const shared = ['public', 'members'].includes(ent.access) || ent.publicRead
      return !shared && (typeof v === 'object' ? Object.keys(v as object).length > 0 : Number(v) > 0)
    })
    check('dashboard_stats does not leak other workspaces', !nonzero, JSON.stringify(leak))
  } catch (err) {
    check('dashboard_stats runs', false, (err as Error).message)
  }

  await db.close()
  return results

  function slotOn(n: number) {
    return slotOnDay(spec.scheduling!, n)
  }

  async function verifySpamLimit(e: Entity) {
    const send = (address: string) => asVisitorFrom(address, tx => insertBlind(tx, e, sampleRow(e, orgA, 8, ANON)))
    let blocked = false
    for (let i = 0; i < 6; i++) {
      try { await send('203.0.113.7') } catch { blocked = i === 5 }
    }
    check(`${e.name}: one sender cannot flood the form`, blocked, 'a sixth message went through')
    let otherOk = true
    try { await send('203.0.113.8') } catch { otherOk = false }
    check(`${e.name}: other senders are not affected`, otherOk, 'another sender was blocked')
    const { rows } = await db.query<{ sender: string }>(`select sender from public.submission_log limit 1`)
    check('spam log stores no raw addresses', !rows[0]?.sender.includes('.'), rows[0]?.sender ?? '')
    check('apps cannot read the spam log', await fails(alice, tx => tx.query(`select 1 from public.submission_log`).then((r) => { if (!r.rows.length) throw new Error('empty') })), 'spam log readable')
  }

  async function verifyScheduling() {
    const s = spec.scheduling!
    const e = byName.get(s.entity)!
    const t = `public.${e.name}`
    const res = s.resource ? e.fields.find(f => f.name === s.resource)! : undefined
    const row = (start: string, extra: Record<string, unknown> = {}) => ({ ...sampleRow(e, orgA, 1, customer!), [s.start]: start, ...extra })
    const book = (u: User, start: string, extra: Record<string, unknown> = {}) => as(u, async tx => (await insert(tx, e, row(start, extra))).rows[0]!.id)
    const refuses = (u: User, start: string, extra: Record<string, unknown> = {}) => fails(u, tx => insert(tx, e, row(start, extra)))
    const who = res ? { [res.name]: samples[orgA]![res.to!] } : {}
    const noon = (n: number, time: string) => slotOnDay(s, n, time)
    // Long enough that the next slot overlaps it.
    if (s.service) {
      const svc = e.fields.find(f => f.name === s.service)!
      await db.query(`update public.${svc.to} set ${s.duration} = $1`, [s.step * 2])
    }
    const first = noon(10, s.open)
    const firstId = await book(customer!, first, who)
    check('booking: a free slot can be booked', Boolean(firstId), 'booking failed')
    const { rows } = await db.query<{ ends_at: string }>(`select ends_at from ${t} where id = $1`, [firstId])
    check('booking: the end time is computed by the database', Boolean(rows[0]?.ends_at), 'no end time')
    check('booking: the same slot cannot be taken twice', await refuses(otherCustomer!, first, who), 'double booked')
    const [h, m] = s.open.split(':').map(Number) as [number, number]
    const overlapping = `${String(h).padStart(2, '0')}:${String(m + s.step).padStart(2, '0')}`
    check('booking: overlapping slots are refused', await refuses(otherCustomer!, noon(10, overlapping), who), 'overlap accepted')
    check('booking: times before opening are refused', await refuses(customer!, noon(11, '02:00'), who), 'booked at night')
    check('booking: times in the past are refused', await refuses(customer!, '2020-01-07T10:00:00+05:00', who), 'booked in the past')
    if (s.closedDays.length) {
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const d = new Date(Date.now() + 864e5)
      while (!s.closedDays.includes(days[d.getUTCDay()] as never)) d.setUTCDate(d.getUTCDate() + 1)
      check('booking: closed days are refused', await refuses(customer!, `${d.toISOString().slice(0, 10)}T${s.open}:00+05:00`, who), 'booked on a closed day')
    }
    const slotArgs = (day: string) => [orgA, day, ...(s.service ? [samples[orgA]![s.service.replace(/_id$/, '')] ?? row(first)[s.service]] : [])]
    const free = async (u: User, day: string) => as(u, async tx => (await tx.query<{ s: string }>(
      `select public.free_slots($1::uuid, $2::date${s.service ? ', $3::uuid' : ''}) as s`, slotArgs(day))).rows.map(r => new Date(r.s).getTime()))
    const day = first.slice(0, 10)
    const before = await free(ANON, day)
    check('booking: visitors can see free slots', before.length > 0, 'no slots')
    if (res) {
      const onlyOne = (await db.query(`select 1 from public.${res.to} where org_id = $1`, [orgA])).rows.length === 1
      if (onlyOne) check('booking: booked slots disappear from the free list', !before.includes(new Date(first).getTime()), 'booked slot still free')
      const auto = await book(otherCustomer!, noon(12, s.open))
      const { rows: picked } = await db.query<Record<string, string>>(`select ${res.name} as r from ${t} where id = $1`, [auto])
      check('booking: "first free" assigns someone', Boolean(picked[0]?.r), 'no one assigned')
    }
    if (s.status) {
      await as(alice, tx => tx.query(`update ${t} set ${s.status} = $1 where id = $2`, [s.inactive[0], firstId]))
      let rebooked = true
      try { await book(otherCustomer!, first, who) } catch { rebooked = false }
      check('booking: cancelling frees the slot', rebooked, 'slot stayed taken')
    }
  }

  async function verifyCommerce() {
    const c = spec.commerce!
    const product = byName.get(c.product)!
    const pt = `public.${product.name}`
    const prodA = samples[orgA]![product.name]
    if (!prodA || !customer) return check('checkout: sample product exists', false, 'no product to order')
    const price = Number((await db.query<{ p: string }>(`select ${c.price} as p from ${pt} where id = $1`, [prodA])).rows[0]!.p)
    if (c.stock) await db.query(`update ${pt} set ${c.stock} = 5 where id = $1`, [prodA])
    const variant = c.variants ? samples[orgA]!.shop_variant : undefined
    if (variant) await db.query(`update public.shop_variant set stock = 5, price = 250 where id = $1`, [variant])
    const unit = variant ? 250 : price
    const line = (quantity: number, extra: Record<string, unknown> = {}) => ({ product_id: prodA, quantity, ...(variant ? { variant_id: variant } : {}), ...extra })
    const stockNow = async () => Number((variant
      ? await db.query<{ s: number }>(`select stock as s from public.shop_variant where id = $1`, [variant])
      : await db.query<{ s: number }>(`select ${c.stock} as s from ${pt} where id = $1`, [prodA])).rows[0]!.s)
    const details: Record<string, unknown> = { customer_name: 'Carol', phone: '+998 90 000 00 00', address: '1 Main St' }
    for (const f of c.orderFields) {
      const v = sampleValue({ ...f, label: f.label ?? f.name, list: true, search: false } as Field, 1, '', undefined)
      if (v !== undefined) details[f.name] = v
    }
    const place = (u: User, items: unknown[], d = details) => as(u, async tx =>
      (await tx.query<{ ids: string[] }>(`select public.place_order($1::jsonb, $2::jsonb) as ids`, [JSON.stringify(items), JSON.stringify(d)])).rows[0]!.ids)

    check('checkout: visitors must sign in to order', await fails(ANON, tx => tx.query(`select public.place_order('[]'::jsonb, '{}'::jsonb)`)), 'a visitor placed an order')
    check('checkout: required details are enforced', await fails(customer, tx => tx.query(`select public.place_order($1::jsonb, '{}'::jsonb)`, [JSON.stringify([line(1)])])), 'order without name/phone/address accepted')
    check('checkout: empty carts are rejected', await fails(customer, tx => tx.query(`select public.place_order('[]'::jsonb, $1::jsonb)`, [JSON.stringify(details)])), 'empty order accepted')

    let orderId: string | undefined
    try {
      orderId = (await place(customer, [line(2, { price: 0.01 })]))[0]
    } catch (err) {
      return check('checkout: a customer can place an order', false, (err as Error).message)
    }
    const { rows: [order] } = await db.query<{ subtotal: string, total: string, delivery_fee: string, created_by: string, status: string }>(
      `select subtotal, total, delivery_fee, created_by, status from public.shop_order where id = $1`, [orderId])
    check('checkout: a customer can place an order', Boolean(order), 'no order row')
    check('checkout: prices come from the database, not the app', Number(order!.subtotal) === unit * 2, `subtotal ${order!.subtotal}, expected ${unit * 2}`)
    const expectedFee = c.delivery.freeFrom !== undefined && unit * 2 >= c.delivery.freeFrom ? 0 : c.delivery.fee
    check('checkout: delivery fee and total are computed', Number(order!.delivery_fee) === expectedFee && Number(order!.total) === unit * 2 + expectedFee, `fee ${order!.delivery_fee}, total ${order!.total}`)
    check('checkout: the order belongs to the customer', order!.created_by === customer.id, 'created_by is not the customer')
    const items = await db.query<{ unit_price: string, quantity: number }>(`select unit_price, quantity from public.shop_order_item where order_id = $1`, [orderId])
    check('checkout: order lines copy price and quantity', items.rows.length === 1 && Number(items.rows[0]!.unit_price) === unit && items.rows[0]!.quantity === 2, JSON.stringify(items.rows))
    if (c.stock) {
      const stock = await stockNow()
      check('checkout: stock is reserved', stock === 3, `stock is ${stock}, expected 3`)
      check('checkout: you cannot order more than is in stock', await fails(customer, tx => tx.query(`select public.place_order($1::jsonb, $2::jsonb)`, [JSON.stringify([line(4)]), JSON.stringify(details)])), 'oversold')
    }
    check('orders: customers see their own orders and lines', (await count(customer, `select 1 from public.shop_order where id = $1`, [orderId])) === 1
      && (await count(customer, `select 1 from public.shop_order_item where order_id = $1`, [orderId])) === 1, 'customer cannot read the order')
    check('orders: other customers cannot see them', (await count(otherCustomer!, `select 1 from public.shop_order where id = $1`, [orderId])) === 0
      && (await count(otherCustomer!, `select 1 from public.shop_order_item where order_id = $1`, [orderId])) === 0, 'another customer reads the order')
    check('orders: visitors cannot see them', (await count(ANON, `select 1 from public.shop_order where id = $1`, [orderId])) === 0, 'visitor reads orders')
    check('orders: staff see them', (await count(dave!, `select 1 from public.shop_order where id = $1`, [orderId])) === 1, 'staff cannot read orders')
    check('orders: customers cannot insert orders directly', await fails(customer, tx => tx.query(
      `insert into public.shop_order (org_id, number, payment_method, total, customer_name, phone, address, subtotal, delivery_fee) values ($1, 1, $2, 0, 'x', 'x', 'x', 0, 0)`, [orgA, c.payments[0]])), 'direct insert accepted')
    check('orders: customers cannot edit their orders', (await count(customer, `update public.shop_order set total = 0 where id = $1 returning id`, [orderId])) === 0, 'customer edited the order')
    await as(dave!, tx => tx.query(`update public.shop_order set total = 0, subtotal = 0, status = 'confirmed' where id = $1`, [orderId]))
    const after = (await db.query<{ total: string, status: string }>(`select total, status from public.shop_order where id = $1`, [orderId])).rows[0]!
    check('orders: staff move the status forward', after.status === 'confirmed', `status ${after.status}`)
    check('orders: nobody can rewrite totals from an app', Number(after.total) === Number(order!.total), `total changed to ${after.total}`)
    check('orders: confirmed orders cannot be cancelled by the customer', await fails(customer, tx => tx.query(`select public.cancel_order($1)`, [orderId])), 'cancelled after confirmation')

    const second = (await place(customer, [line(1)]))[0]!
    await as(customer, tx => tx.query(`select public.cancel_order($1)`, [second]))
    const cancelled = (await db.query<{ status: string }>(`select status from public.shop_order where id = $1`, [second])).rows[0]!
    check('orders: customers can cancel new orders', cancelled.status === 'cancelled', `status ${cancelled.status}`)
    if (c.stock) {
      const stock = await stockNow()
      check('orders: cancelling returns stock', stock === 3, `stock is ${stock}, expected 3`)
    }
    check('orders: cancelled orders stay cancelled', await fails(alice, tx => tx.query(`update public.shop_order set status = 'new' where id = $1`, [second])), 'reopened a cancelled order')

    if (c.active) {
      await db.query(`update ${pt} set ${c.active} = false where id = $1`, [prodA])
      check('catalog: hidden products are invisible to visitors', (await count(ANON, `select 1 from ${pt} where id = $1`, [prodA])) === 0, 'visitor sees a hidden product')
      check('catalog: hidden products cannot be ordered', await fails(customer, tx => tx.query(`select public.place_order($1::jsonb, $2::jsonb)`, [JSON.stringify([line(1)]), JSON.stringify(details)])), 'ordered a hidden product')
      check('catalog: staff still see hidden products', (await count(alice, `select 1 from ${pt} where id = $1`, [prodA])) === 1, 'staff lost the product')
      await db.query(`update ${pt} set ${c.active} = true where id = $1`, [prodA])
    }

    if (c.variants) {
      const withoutOption = { product_id: prodA, quantity: 1 }
      check('options: a product with options needs one chosen', await fails(customer, tx => tx.query(`select public.place_order($1::jsonb, $2::jsonb)`, [JSON.stringify([withoutOption]), JSON.stringify(details)])), 'ordered without choosing')
      const other = orgB ? samples[orgB]!.shop_variant : undefined
      if (other) check('options: an option must belong to the product', await fails(customer, tx => tx.query(`select public.place_order($1::jsonb, $2::jsonb)`, [JSON.stringify([{ ...withoutOption, variant_id: other }]), JSON.stringify(details)])), 'used another product\'s option')
      await db.query(`update public.shop_variant set active = false where id = $1`, [variant])
      check('options: unavailable options cannot be ordered', await fails(customer, tx => tx.query(`select public.place_order($1::jsonb, $2::jsonb)`, [JSON.stringify([line(1)]), JSON.stringify(details)])), 'ordered an unavailable option')
      await db.query(`update public.shop_variant set active = true where id = $1`, [variant])
      check('options: visitors can read them', (await count(ANON, `select 1 from public.shop_variant where id = $1`, [variant])) === 1, 'options hidden from visitors')
    }

    if (c.payments.some(m => m !== 'cash')) {
      const pay = (tx: Transaction, amount: number, ref: string) => tx.query(`select public.confirm_payment($1, 'click', $2, $3)`, [orderId, ref, amount])
      const total = Number(order!.total)
      check('payments: customers cannot mark an order paid', await fails(customer, tx => pay(tx, total, 'x1')), 'a customer confirmed a payment')
      check('payments: staff cannot mark an order paid through the function', await fails(alice, tx => pay(tx, total, 'x2')), 'staff called confirm_payment')
      const service = (amount: number, ref: string) => asService(tx => tx.query(`select public.confirm_payment($1, 'click', $2, $3)`, [orderId, ref, amount]))
      let wrong = false
      try { await service(total - 1, 'x3') } catch { wrong = true }
      check('payments: the paid amount must match the order total', wrong, 'a short payment was accepted')
      await service(total, 'x4')
      await service(total, 'x4')
      const paid = (await db.query<{ payment_status: string }>(`select payment_status from public.shop_order where id = $1`, [orderId])).rows[0]!
      const events = await db.query(`select 1 from public.payment_event where external_id = 'x4'`)
      check('payments: a confirmed payment marks the order paid', paid.payment_status === 'paid', paid.payment_status)
      check('payments: repeated provider callbacks count once', events.rows.length === 1, `${events.rows.length} events`)
      check('payments: apps cannot read payment events', await fails(customer, tx => tx.query(`select 1 from public.payment_event`)), 'payment events readable')
      let cancelledPay = false
      const secondTotal = Number((await db.query<{ total: string }>(`select total from public.shop_order where id = $1`, [second])).rows[0]!.total)
      try { await asService(tx => tx.query(`select public.confirm_payment($1, 'click', 'x5', $2)`, [second, secondTotal])) } catch { cancelledPay = true }
      check('payments: a cancelled order cannot be paid', cancelledPay, 'paid a cancelled order')
    }

    if (type === 'marketplace' && orgB) {
      const prodB = samples[orgB]![product.name]
      if (c.stock && prodB) await db.query(`update ${pt} set ${c.stock} = 5 where id = $1`, [prodB])
      const variantB = c.variants ? samples[orgB]!.shop_variant : undefined
      if (variantB) await db.query(`update public.shop_variant set stock = 5 where id = $1`, [variantB])
      try {
        const ids = await place(customer, [line(1), { product_id: prodB, quantity: 1, ...(variantB ? { variant_id: variantB } : {}) }])
        const { rows } = await db.query<{ org_id: string }>(`select org_id from public.shop_order where id = any($1::uuid[])`, [ids])
        check('marketplace: a cart is split into one order per seller', ids.length === 2 && new Set(rows.map(r => r.org_id)).size === 2, `${ids.length} orders`)
        check('marketplace: sellers only see their own orders', (await count(bob, `select 1 from public.shop_order where id = any($1::uuid[])`, [ids])) === 1, 'seller sees another seller\'s order')
      } catch (err) {
        check('marketplace: a cart is split into one order per seller', false, (err as Error).message)
      }
    }
  }
}

// An opening hour on the nth day from now that the business is open.
function slotOnDay(s: NonNullable<NormalizedSpec['scheduling']>, n: number, time = s.open) {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const d = new Date(Date.now() + 864e5)
  let open = 0
  for (;;) {
    if (!s.closedDays.includes(days[d.getUTCDay()] as never) && ++open === n) break
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return `${d.toISOString().slice(0, 10)}T${time}:00+05:00`
}

// A value an outsider might try to sneak into a staff-only field.
function forgedValue(f: Field): unknown {
  if (f.type === 'enum') return f.options!.find(o => o !== f.default) ?? undefined
  if (f.type === 'boolean') return !(f.default ?? false)
  if (['integer', 'number', 'money', 'percent'].includes(f.type)) return 42
  if (['text', 'longtext'].includes(f.type)) return 'forged'
  return undefined
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
    case 'boolean': return f.default ?? true
    case 'date': return '2025-01-15'
    case 'datetime': return '2025-01-15T10:00:00Z'
    case 'enum': return f.default ?? f.options![0]
    case 'tags': return ['alpha', 'beta']
    case 'json': return { sample: n }
    case 'relation': return relationId ?? (f.required ? '00000000-0000-0000-0000-000000000000' : undefined)
    case 'user': return userId
  }
}
