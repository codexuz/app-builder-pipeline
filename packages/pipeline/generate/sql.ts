import type { Card, Entity, Field, NormalizedSpec } from '../spec.ts'

export const lit = (v: string | number | boolean) =>
  typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v)

const NUMERIC = new Set(['integer', 'number', 'money', 'percent'])
const TEXTUAL = new Set(['text', 'longtext', 'email', 'phone', 'url'])

function columnType(f: Field): string {
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
  if (e.visibility === 'public') out.push(`create index ${t}_recent_idx on public.${t} (created_at desc);`)
  for (const f of e.fields) {
    if (f.type === 'relation' || f.type === 'user') out.push(`create index ${t}_${f.name}_idx on public.${t} (${f.name});`)
  }
  if (!['created_at', 'updated_at'].includes(e.sort.field)) out.push(`create index ${t}_sort_idx on public.${t} (org_id, ${e.sort.field});`)
  return out
}

// Keeps org_id/created_by trustworthy and stops rows pointing at another workspace's data.
function guardSql(e: Entity, spec: NormalizedSpec): string {
  const t = e.name
  const byName = new Map(spec.entities.map(x => [x.name, x]))
  const refChecks = e.fields.flatMap((f) => {
    if (f.type === 'relation') {
      const target = byName.get(f.to!)!
      const sameOrg = target.visibility === 'public' ? '' : ' and org_id = new.org_id'
      return [`  if new.${f.name} is not null and not exists (select 1 from public.${f.to} where id = new.${f.name}${sameOrg}) then
    raise exception '${f.label} must point to a ${target.label.toLowerCase()} you can access' using errcode = '23503';
  end if;`]
    }
    if (f.type === 'user' && !spec.app.publicProfiles) {
      return [`  if new.${f.name} is not null and not exists (select 1 from public.memberships where user_id = new.${f.name} and org_id = new.org_id) then
    raise exception '${f.label} must be a member of this workspace' using errcode = '23503';
  end if;`]
    }
    return []
  })
  return `create or replace function public.${t}_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.org_id <> old.org_id then
      raise exception 'Records cannot move between workspaces' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
${refChecks.join('\n')}
  return new;
end $$;

create trigger ${t}_guard before insert or update on public.${t}
  for each row execute function public.${t}_guard();
create trigger ${t}_updated_at before update on public.${t}
  for each row execute function public.set_updated_at();
create trigger ${t}_audit after insert or update or delete on public.${t}
  for each row execute function public.audit_row();`
}

function policiesSql(e: Entity): string {
  const t = e.name
  const p = e.permissions
  const role = (r: string) => `public.has_org_role(org_id, '${r}')`
  const mine = `(created_by = (select auth.uid()) or ${role('admin')})`
  const read = e.visibility === 'public' ? 'true'
    : e.visibility === 'own' ? `${role(p.read)} and ${mine}`
      : role(p.read)
  const ownOr = (action: 'update' | 'delete') =>
    e.own.includes(action) || e.visibility === 'own' ? ` and ${mine}` : ''
  return `alter table public.${t} enable row level security;
create policy ${t}_select on public.${t} for select to authenticated
  using (${read});
create policy ${t}_insert on public.${t} for insert to authenticated
  with check (${role(p.create)});
create policy ${t}_update on public.${t} for update to authenticated
  using (${role(p.update)}${ownOr('update')})
  with check (${role(p.update)});
create policy ${t}_delete on public.${t} for delete to authenticated
  using (${role(p.delete)}${ownOr('delete')});`
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

function tenancySql(spec: NormalizedSpec): string {
  const out: string[] = []
  if (spec.app.tenancy === 'user') {
    out.push(`-- User tenancy: every account gets a private workspace at sign-up.
create or replace function public.after_signup(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  insert into public.organizations (name, personal, created_by) values ('Personal', true, p_user) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, p_user, 'owner');
end $$;`)
  }
  if (spec.app.publicProfiles) {
    out.push(`-- Public content shows its author, so names and avatars are visible to every signed-in user.
create policy profiles_select_public on public.profiles for select to authenticated using (true);`)
  }
  return out.join('\n\n')
}

// Files attached to public records are readable by everyone who can read the record.
function publicFilesSql(spec: NormalizedSpec): string {
  const tables = spec.entities.filter(e => e.visibility === 'public' && e.attachments).map(e => lit(e.name))
  if (!tables.length) return ''
  return `create policy attachments_select_public on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[2] in (${tables.join(', ')}));`
}

export function generateSql(spec: NormalizedSpec): string {
  const sections = [
    `-- GENERATED from app.spec.yaml by the pipeline. Do not edit by hand.
-- Once this migration is deployed, schema changes go into new, later migrations (see AGENTS.md).`,
    tenancySql(spec),
    ...spec.entities.map(e => `-- ${e.label} -------------------------------------------------------------\n${tableSql(e)}`),
    '-- Foreign keys (added after all tables so relations may point in any direction)',
    ...spec.entities.flatMap(foreignKeysSql),
    '-- Indexes',
    ...spec.entities.flatMap(indexesSql),
    ...spec.entities.map(e => guardSql(e, spec)),
    ...spec.entities.map(policiesSql),
    `-- Realtime: list pages refresh live when rows change.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
${spec.entities.filter(e => e.realtime).map(e => `    alter publication supabase_realtime add table public.${e.name};`).join('\n') || '    null;'}
  end if;
end $$;`,
    publicFilesSql(spec),
    dashboardSql(spec)
  ]
  return `${sections.filter(Boolean).join('\n\n')}\n`
}
