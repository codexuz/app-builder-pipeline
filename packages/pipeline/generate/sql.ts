import type { Card, Entity, Field, NormalizedSpec } from '../spec.ts'

export const lit = (v: string | number | boolean) =>
  typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v)

const NUMERIC = new Set(['integer', 'number', 'money', 'percent'])
const TEXTUAL = new Set(['text', 'longtext', 'email', 'phone', 'url'])
// Roles a browser or app connects as; security-definer functions run as the owner and bypass field rules.
const CLIENT = `current_user in ('anon', 'authenticated')`

export function columnType(f: Field): string {
  switch (f.type) {
    case 'integer': return 'integer'
    case 'number': return 'numeric'
    case 'money': return 'numeric(14,2)'
    case 'percent': return 'numeric(5,2)'
    case 'boolean': return 'boolean'
    case 'date': return 'date'
    case 'datetime': return 'timestamptz'
    case 'tags': return 'text[]'
    case 'json': return 'jsonb'
    case 'relation':
    case 'user': return 'uuid'
    default: return 'text'
  }
}

function defaultSql(f: Field): string | undefined {
  if (f.type === 'boolean') return String(f.default ?? false)
  if (f.type === 'tags') return `'{}'`
  if (f.default === undefined) return undefined
  if (f.default === 'now' && f.type === 'date') return 'current_date'
  if (f.default === 'now' && f.type === 'datetime') return 'now()'
  if (f.default === 'me' && f.type === 'user') return 'auth.uid()'
  if (NUMERIC.has(f.type)) return String(Number(f.default))
  return lit(String(f.default))
}

function checks(t: string, f: Field): string[] {
  const c = f.name
  const out: string[] = []
  const add = (expr: string, suffix = 'chk') => out.push(`constraint ${t}_${c}_${suffix} check (${expr})`)
  if (TEXTUAL.has(f.type)) {
    const max = f.max ?? { text: 500, longtext: 20000, email: 320, phone: 40, url: 2000 }[f.type as 'text']
    if (f.required) add(`char_length(btrim(${c})) > 0`, 'req')
    add(`char_length(${c}) <= ${max}`, 'len')
  }
  if (f.type === 'email') add(`${c} ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`)
  if (f.type === 'url') add(`${c} ~* '^https?://'`)
  if (f.type === 'enum') add(`${c} in (${f.options!.map(lit).join(', ')})`)
  if (NUMERIC.has(f.type)) {
    const min = f.min ?? (f.type === 'percent' ? 0 : undefined)
    const max = f.max ?? (f.type === 'percent' ? 100 : undefined)
    if (min !== undefined) add(`${c} >= ${min}`, 'min')
    if (max !== undefined) add(`${c} <= ${max}`, 'max')
  }
  return out
}

function tableSql(e: Entity): string {
  const t = e.name
  const cols = [
    'id uuid primary key default gen_random_uuid()',
    'org_id uuid not null references public.organizations(id) on delete cascade',
    ...e.fields.map((f) => {
      const parts = [f.name, columnType(f)]
      if (f.required || f.type === 'boolean' || f.type === 'tags') parts.push('not null')
      const d = defaultSql(f)
      if (d) parts.push(`default ${d}`)
      return parts.join(' ')
    }),
    'created_by uuid default auth.uid()',
    'created_at timestamptz not null default now()',
    'updated_at timestamptz not null default now()',
    ...e.fields.flatMap(f => checks(t, f)),
    ...e.fields.filter(f => f.unique).map(f => `constraint ${t}_${f.name}_key unique (org_id, ${f.name})`)
  ]
  return `create table public.${t} (\n  ${cols.join(',\n  ')}\n);`
}

function foreignKeysSql(e: Entity): string[] {
  const t = e.name
  const out = [`alter table public.${t} add constraint ${t}_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;`]
  for (const f of e.fields) {
    if (f.type === 'relation') {
      const onDelete = f.cascade ? 'cascade' : f.required ? 'restrict' : 'set null'
      out.push(`alter table public.${t} add constraint ${f.fk} foreign key (${f.name}) references public.${f.to}(id) on delete ${onDelete};`)
    }
    if (f.type === 'user') {
      const onDelete = f.required ? 'restrict' : 'set null'
      out.push(`alter table public.${t} add constraint ${f.fk} foreign key (${f.name}) references public.profiles(id) on delete ${onDelete};`)
    }
  }
  return out
}

function indexesSql(e: Entity): string[] {
  const t = e.name
  const out = [`create index ${t}_org_idx on public.${t} (org_id, created_at desc);`]
  if (['members', 'public'].includes(e.access) || e.publicRead) out.push(`create index ${t}_recent_idx on public.${t} (created_at desc);`)
  if (e.access === 'customer') out.push(`create index ${t}_customer_idx on public.${t} (created_by, created_at desc);`)
  for (const f of e.fields) {
    if (f.type === 'relation' || f.type === 'user') out.push(`create index ${t}_${f.name}_idx on public.${t} (${f.name});`)
  }
  if (!['created_at', 'updated_at'].includes(e.sort.field)) out.push(`create index ${t}_sort_idx on public.${t} (org_id, ${e.sort.field});`)
  return out
}

// Keeps org_id/created_by trustworthy, enforces staff and readonly fields, and stops rows pointing at
// data in another workspace or at another customer's records.
function guardSql(e: Entity, spec: NormalizedSpec): string {
  const t = e.name
  const byName = new Map(spec.entities.map(x => [x.name, x]))
  const notStaff = `not public.has_org_role(new.org_id, 'viewer')`
  const resetOnInsert = (f: Field) => `new.${f.name} := ${defaultSql(f) ?? 'null'};`

  const protectedFields = e.fields.filter(f => f.staff || f.readonly)
  const fieldRules = protectedFields.map((f) => {
    const who = f.readonly ? CLIENT : `${CLIENT} and ${notStaff}`
    return `  -- ${f.label}: ${f.readonly ? 'set only by database functions' : 'set only by staff'}
  if ${who} then
    if tg_op = 'INSERT' then ${resetOnInsert(f)} else new.${f.name} := old.${f.name}; end if;
  end if;`
  })

  const refChecks = e.fields.flatMap((f) => {
    if (f.type === 'relation') {
      const target = byName.get(f.to!)!
      const shared = target.access === 'public' || target.access === 'members'
      const sameOrg = shared ? '' : ' and org_id = new.org_id'
      const lines = [`  if new.${f.name} is not null and not exists (select 1 from public.${f.to} where id = new.${f.name}${sameOrg}) then
    raise exception '${f.label} must point to a ${target.label.toLowerCase()} you can access' using errcode = '23503';
  end if;`]
      // Customers may only attach their records to their own customer records (an item to their own order).
      if (target.access === 'customer') {
        lines.push(`  if new.${f.name} is not null and ${notStaff}
    and not exists (select 1 from public.${f.to} where id = new.${f.name} and created_by = auth.uid()) then
    raise exception '${f.label} must be one of your own ${target.plural.toLowerCase()}' using errcode = '42501';
  end if;`)
      }
      return lines
    }
    if (f.type === 'user' && !spec.app.publicProfiles) {
      return [`  if new.${f.name} is not null and not exists (select 1 from public.memberships where user_id = new.${f.name} and org_id = new.org_id) then
    raise exception '${f.label} must be a member of this workspace' using errcode = '23503';
  end if;`]
    }
    return []
  })

  // Security invoker on purpose: current_user must be the app's role (anon/authenticated) for field rules,
  // and the database owner when checkout or other definer functions write. Lookups then follow RLS too.
  return `create or replace function public.${t}_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.org_id <> old.org_id then
      raise exception 'Records cannot move between workspaces' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  elsif ${CLIENT} then
    -- Apps cannot claim to be someone else; visitors create anonymous rows.
    new.created_by := auth.uid();
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
${[...fieldRules, ...refChecks].join('\n')}
  return new;
end $$;

create trigger ${t}_guard before insert or update on public.${t}
  for each row execute function public.${t}_guard();
create trigger ${t}_updated_at before update on public.${t}
  for each row execute function public.set_updated_at();
create trigger ${t}_audit after insert or update or delete on public.${t}
  for each row execute function public.audit_row();`
}

function policiesSql(e: Entity, spec: NormalizedSpec): string {
  const t = e.name
  const p = e.permissions
  const role = (r: string) => `public.has_org_role(org_id, '${r}')`
  const mine = `created_by = (select auth.uid())`
  const policy = (name: string, cmd: string, to: string, clause: string) =>
    `create policy ${t}_${name} on public.${t} for ${cmd} to ${to}\n  ${clause};`
  const out = [`alter table public.${t} enable row level security;`]

  switch (e.access) {
    case 'team':
    case 'private': {
      const ownOnly = (a: 'update' | 'delete') => e.access === 'private' || e.own.includes(a) ? ` and (${mine} or ${role('admin')})` : ''
      const read = e.access === 'private' ? `${role(p.read)} and (${mine} or ${role('admin')})` : role(p.read)
      out.push(
        policy('select', 'select', 'authenticated', `using (${read})`),
        policy('insert', 'insert', 'authenticated', `with check (${role(p.create)})`),
        policy('update', 'update', 'authenticated', `using (${role(p.update)}${ownOnly('update')})\n  with check (${role(p.update)})`),
        policy('delete', 'delete', 'authenticated', `using (${role(p.delete)}${ownOnly('delete')})`)
      )
      break
    }
    case 'members':
    case 'public': {
      const active = e.name === spec.commerce?.product && spec.commerce.active
      // Visitors see public rows; hidden (inactive) products stay visible to the shop's staff only.
      const read = active ? `${spec.commerce!.active} or ${role('viewer')}` : 'true'
      out.push(
        policy('select', 'select', e.access === 'public' ? 'anon, authenticated' : 'authenticated', `using (${read})`),
        policy('insert', 'insert', 'authenticated', `with check (${role(p.create)})`),
        policy('update', 'update', 'authenticated', `using (${role(p.update)})\n  with check (${role(p.update)})`),
        policy('delete', 'delete', 'authenticated', `using (${role(p.delete)})`)
      )
      break
    }
    case 'customer': {
      const can = (a: 'update' | 'delete') => e.customerCan.includes(a) ? ` or ${mine}` : ''
      out.push(policy('select', 'select', 'authenticated', `using (${mine} or ${role(p.read)})`))
      if (e.publicRead) out.push(policy('select_public', 'select', 'anon, authenticated', 'using (true)'))
      if (!e.createdByFunction) {
        out.push(policy('insert', 'insert', 'authenticated', `with check (${role(p.create)} or public.accepts_customers(org_id))`))
      }
      out.push(
        policy('update', 'update', 'authenticated', `using (${role(p.update)}${can('update')})\n  with check (${role(p.update)}${can('update')})`),
        policy('delete', 'delete', 'authenticated', `using (${role(p.delete)}${can('delete')})`)
      )
      break
    }
    case 'inbox':
      out.push(
        policy('select', 'select', 'authenticated', `using (${role(p.read)})`),
        policy('insert', 'insert', 'anon, authenticated', `with check (public.accepts_customers(org_id) or ${role(p.create)})`),
        policy('update', 'update', 'authenticated', `using (${role(p.update)})\n  with check (${role(p.update)})`),
        policy('delete', 'delete', 'authenticated', `using (${role(p.delete)})`)
      )
      break
  }
  return out.join('\n')
}

function whereSql(card: Card): string {
  if (card.type === 'breakdown' || !card.where) return ''
  return Object.entries(card.where).map(([k, v]) => {
    const vals = [v].flat()
    return vals.length === 1 ? ` and ${k} = ${lit(vals[0]!)}` : ` and ${k} in (${vals.map(lit).join(', ')})`
  }).join('')
}

// Runs as the caller (security invoker), so RLS still decides what is counted.
function dashboardSql(spec: NormalizedSpec): string {
  const parts = spec.dashboard.map((c, i) => {
    const from = `from public.${c.entity} where org_id = p_org`
    if (c.type === 'count') return `'c${i}', (select count(*) ${from}${whereSql(c)})`
    if (c.type === 'sum') return `'c${i}', (select coalesce(sum(${c.field}), 0) ${from}${whereSql(c)})`
    return `'c${i}', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select ${c.field}::text as k, count(*) as n ${from} and ${c.field} is not null group by 1) s)`
  })
  return `create or replace function public.dashboard_stats(p_org uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    ${parts.join(',\n    ')}
  )
$$;
grant execute on function public.dashboard_stats(uuid) to authenticated;`
}

function appTypeSql(spec: NormalizedSpec): string {
  const out = [`create or replace function public.app_type()
returns text language sql stable as $$ select ${lit(spec.app.type)}::text $$;`]
  if (spec.app.type === 'personal') {
    out.push(`-- Personal apps: every account gets a private workspace at sign-up.
create or replace function public.after_signup(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  insert into public.organizations (name, personal, created_by) values ('Personal', true, p_user) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, p_user, 'owner');
end $$;`)
  }
  if (spec.app.publicSite) {
    out.push(`-- Shops and sellers are public: visitors see whose catalog they are browsing.
create policy organizations_select_public on public.organizations for select to anon, authenticated using (not personal);`)
  }
  if (spec.app.publicProfiles) {
    out.push(`-- Shared content shows its author, so names and avatars are visible to every signed-in user.
create policy profiles_select_public on public.profiles for select to authenticated using (true);`)
  }
  return out.join('\n\n')
}

// After the tables exist: staff can see the names of people who ordered or booked with their workspace.
function customerProfilesSql(spec: NormalizedSpec): string {
  const customerTables = spec.entities.filter(e => e.access === 'customer')
  if (!customerTables.length) return ''
  return `create or replace function public.is_customer_of_mine(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select ${customerTables.map(e => `exists (select 1 from public.${e.name} where created_by = p_user and public.has_org_role(org_id, 'viewer'))`).join('\n    or ')}
$$;
create policy profiles_select_customers on public.profiles for select to authenticated using (public.is_customer_of_mine(id));`
}

// Value of a checkout question taken from the JSON the app sends, cast to its column type.
function detailValue(f: Field): string {
  const raw = `p_details ->> ${lit(f.name)}`
  switch (f.type) {
    case 'boolean': return `coalesce((${raw})::boolean, false)`
    case 'integer': return `nullif(${raw}, '')::integer`
    case 'number':
    case 'money':
    case 'percent': return `nullif(${raw}, '')::numeric`
    case 'date': return `nullif(${raw}, '')::date`
    case 'datetime': return `nullif(${raw}, '')::timestamptz`
    case 'tags': return `coalesce(array(select jsonb_array_elements_text(p_details -> ${lit(f.name)})), '{}')`
    case 'json': return `p_details -> ${lit(f.name)}`
    default: return `nullif(btrim(${raw}), '')`
  }
}

// Checkout: prices, totals and stock come from the database, never from the app.
// Marketplace carts are split into one order per seller.
function commerceSql(spec: NormalizedSpec): string {
  const c = spec.commerce
  if (!c) return ''
  const product = spec.entities.find(e => e.name === c.product)!
  const p = `public.${product.name}`
  const titleCol = product.title
  const order = spec.entities.find(e => e.name === 'shop_order')!
  const extra = c.orderFields.map(f => order.fields.find(x => x.name === f.name)!)
  const required = [
    { name: 'customer_name', label: 'your name' },
    { name: 'phone', label: 'a phone number' },
    { name: 'address', label: 'a delivery address' },
    ...extra.filter(f => f.required && f.type !== 'boolean').map(f => ({ name: f.name, label: f.label.toLowerCase() }))
  ]
  const fee = c.delivery.freeFrom !== undefined
    ? `case when v_sub >= ${c.delivery.freeFrom} then 0 else ${c.delivery.fee} end`
    : String(c.delivery.fee)
  const stockStep = c.stock
    ? `      update ${p} set ${c.stock} = ${c.stock} - v_line.qty where id = v_line.id and ${c.stock} >= v_line.qty;
      if not found then
        raise exception '% is out of stock', v_line.title using errcode = 'P0001';
      end if;`
    : ''
  const activeFilter = c.active ? ` and p.${c.active}` : ''
  const restock = c.stock
    ? `  update ${p} pr set ${c.stock} = pr.${c.stock} + i.quantity
  from public.shop_order_item i
  where i.order_id = new.id and i.product_id = pr.id;`
    : '  null;'

  return `-- Checkout ---------------------------------------------------------------
create sequence public.shop_order_number_seq start 1001;

create or replace function public.place_order(p_items jsonb, p_details jsonb)
returns uuid[] language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_order uuid;
  v_orders uuid[] := '{}';
  v_line record;
  v_sub numeric;
  v_fee numeric;
  v_requested int;
  v_found int;
begin
  if v_uid is null then
    raise exception 'Sign in to place an order' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'Too many items in one order' using errcode = 'P0001';
  end if;
  if p_details ->> 'payment_method' is not null and p_details ->> 'payment_method' not in (${c.payments.map(lit).join(', ')}) then
    raise exception 'This payment method is not available' using errcode = 'P0001';
  end if;
${required.map(r => `  if nullif(btrim(coalesce(p_details ->> ${lit(r.name)}, '')), '') is null then
    raise exception 'Enter ${r.label.replace(/'/g, "''")}' using errcode = 'P0001';
  end if;`).join('\n')}
  if exists (select 1 from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
             where i.product_id is null or i.quantity is null or i.quantity < 1 or i.quantity > 999) then
    raise exception 'Each item needs a quantity between 1 and 999' using errcode = 'P0001';
  end if;

  select count(distinct i.product_id) into v_requested from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int);
  select count(*) into v_found from ${p} p
    where p.id in (select i.product_id from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int))${activeFilter};
  if v_found <> v_requested then
    raise exception 'Some products in your cart are no longer available' using errcode = 'P0001';
  end if;

  for v_org in
    select distinct p.org_id from ${p} p
    where p.id in (select i.product_id from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int))
    order by p.org_id
  loop
    insert into public.shop_order (org_id, number, status, payment_method, payment_status, customer_name, phone, address, note,
      ${[...extra.map(f => f.name), ''].join(', ')}subtotal, delivery_fee, total)
    values (v_org, nextval('public.shop_order_number_seq'), 'new', coalesce(p_details ->> 'payment_method', ${lit(c.payments[0]!)}), 'unpaid',
      btrim(p_details ->> 'customer_name'), btrim(p_details ->> 'phone'), btrim(p_details ->> 'address'), nullif(btrim(p_details ->> 'note'), ''),
      ${[...extra.map(detailValue), ''].join(', ')}0, 0, 0)
    returning id into v_order;

    v_sub := 0;
    for v_line in
      select p.id, p.${titleCol} as title, p.${c.price} as price, sum(i.quantity)::int as qty
      from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
      join ${p} p on p.id = i.product_id
      where p.org_id = v_org
      group by p.id, p.${titleCol}, p.${c.price}
    loop
${stockStep}
      insert into public.shop_order_item (org_id, order_id, product_id, title, unit_price, quantity, line_total)
      values (v_org, v_order, v_line.id, v_line.title, v_line.price, v_line.qty, v_line.price * v_line.qty);
      v_sub := v_sub + v_line.price * v_line.qty;
    end loop;

    v_fee := ${fee};
    update public.shop_order set subtotal = v_sub, delivery_fee = v_fee, total = v_sub + v_fee where id = v_order;
    v_orders := v_orders || v_order;
  end loop;
  return v_orders;
end $$;

revoke execute on function public.place_order(jsonb, jsonb) from public, anon;
grant execute on function public.place_order(jsonb, jsonb) to authenticated;

-- Customers may cancel their own order until the shop confirms it.
create or replace function public.cancel_order(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.shop_order set status = 'cancelled'
  where id = p_order and created_by = auth.uid() and status = 'new';
  if not found then
    raise exception 'This order can no longer be cancelled' using errcode = 'P0001';
  end if;
end $$;

revoke execute on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;

-- Cancelling returns stock; a cancelled order stays cancelled.
create or replace function public.shop_order_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'cancelled' and new.status <> 'cancelled' then
    raise exception 'A cancelled order cannot be reopened; ask the customer to order again' using errcode = 'P0001';
  end if;
  if new.status = 'cancelled' and old.status <> 'cancelled' then
${restock}
  end if;
  return new;
end $$;

create trigger shop_order_status_change before update of status on public.shop_order
  for each row execute function public.shop_order_status_change();`
}

export function generateSql(spec: NormalizedSpec): string {
  const sections = [
    `-- GENERATED from app.spec.yaml by the pipeline. Do not edit by hand.
-- Once this migration is deployed, schema changes go into new, later migrations (see AGENTS.md).`,
    appTypeSql(spec),
    ...spec.entities.map(e => `-- ${e.label} (access: ${e.access}) ${'-'.repeat(40)}\n${tableSql(e)}`),
    '-- Foreign keys (added after all tables so relations may point in any direction)',
    ...spec.entities.flatMap(foreignKeysSql),
    '-- Indexes',
    ...spec.entities.flatMap(indexesSql),
    ...spec.entities.map(e => guardSql(e, spec)),
    ...spec.entities.map(e => policiesSql(e, spec)),
    customerProfilesSql(spec),
    commerceSql(spec),
    `-- Realtime: lists refresh live when rows change.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
${spec.entities.filter(e => e.realtime).map(e => `    alter publication supabase_realtime add table public.${e.name};`).join('\n') || '    null;'}
  end if;
end $$;`,
    dashboardSql(spec)
  ]
  return `${sections.filter(Boolean).join('\n\n')}\n`
}
