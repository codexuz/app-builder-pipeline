-- GENERATED from app.spec.yaml by the pipeline. Do not edit by hand.
-- Once this migration is deployed, schema changes go into new, later migrations (see AGENTS.md).

-- User tenancy: every account gets a private workspace at sign-up.
create or replace function public.after_signup(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  insert into public.organizations (name, personal, created_by) values ('Personal', true, p_user) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, p_user, 'owner');
end $$;

-- Account -------------------------------------------------------------
create table public.account (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'checking',
  opening_balance numeric(14,2) default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_name_req check (char_length(btrim(name)) > 0),
  constraint account_name_len check (char_length(name) <= 500),
  constraint account_kind_chk check (kind in ('checking', 'savings', 'credit', 'cash')),
  constraint account_name_key unique (org_id, name)
);

-- Category -------------------------------------------------------------
create table public.category (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  kind text not null default 'expense',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_name_req check (char_length(btrim(name)) > 0),
  constraint category_name_len check (char_length(name) <= 500),
  constraint category_kind_chk check (kind in ('expense', 'income')),
  constraint category_name_key unique (org_id, name)
);

-- Transaction -------------------------------------------------------------
create table public.entry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null,
  kind text not null default 'expense',
  occurred_on date not null default current_date,
  account_id uuid not null,
  category_id uuid,
  tags text[] not null default '{}',
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entry_description_req check (char_length(btrim(description)) > 0),
  constraint entry_description_len check (char_length(description) <= 500),
  constraint entry_amount_min check (amount >= 0),
  constraint entry_kind_chk check (kind in ('expense', 'income')),
  constraint entry_notes_len check (char_length(notes) <= 20000)
);

-- Budget -------------------------------------------------------------
create table public.budget (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  category_id uuid not null,
  month date not null,
  limit_amount numeric(14,2) not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_limit_amount_min check (limit_amount >= 0)
);

-- Foreign keys (added after all tables so relations may point in any direction)

alter table public.account add constraint account_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.category add constraint category_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.entry add constraint entry_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.entry add constraint entry_account_id_fkey foreign key (account_id) references public.account(id) on delete restrict;

alter table public.entry add constraint entry_category_id_fkey foreign key (category_id) references public.category(id) on delete set null;

alter table public.budget add constraint budget_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.budget add constraint budget_category_id_fkey foreign key (category_id) references public.category(id) on delete cascade;

-- Indexes

create index account_org_idx on public.account (org_id, created_at desc);

create index category_org_idx on public.category (org_id, created_at desc);

create index entry_org_idx on public.entry (org_id, created_at desc);

create index entry_account_id_idx on public.entry (account_id);

create index entry_category_id_idx on public.entry (category_id);

create index entry_sort_idx on public.entry (org_id, occurred_on);

create index budget_org_idx on public.budget (org_id, created_at desc);

create index budget_category_id_idx on public.budget (category_id);

create or replace function public.account_guard()
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

  return new;
end $$;

create trigger account_guard before insert or update on public.account
  for each row execute function public.account_guard();
create trigger account_updated_at before update on public.account
  for each row execute function public.set_updated_at();
create trigger account_audit after insert or update or delete on public.account
  for each row execute function public.audit_row();

create or replace function public.category_guard()
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

  return new;
end $$;

create trigger category_guard before insert or update on public.category
  for each row execute function public.category_guard();
create trigger category_updated_at before update on public.category
  for each row execute function public.set_updated_at();
create trigger category_audit after insert or update or delete on public.category
  for each row execute function public.audit_row();

create or replace function public.entry_guard()
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
  if new.account_id is not null and not exists (select 1 from public.account where id = new.account_id and org_id = new.org_id) then
    raise exception 'Account must point to a account you can access' using errcode = '23503';
  end if;
  if new.category_id is not null and not exists (select 1 from public.category where id = new.category_id and org_id = new.org_id) then
    raise exception 'Category must point to a category you can access' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger entry_guard before insert or update on public.entry
  for each row execute function public.entry_guard();
create trigger entry_updated_at before update on public.entry
  for each row execute function public.set_updated_at();
create trigger entry_audit after insert or update or delete on public.entry
  for each row execute function public.audit_row();

create or replace function public.budget_guard()
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
  if new.category_id is not null and not exists (select 1 from public.category where id = new.category_id and org_id = new.org_id) then
    raise exception 'Category must point to a category you can access' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger budget_guard before insert or update on public.budget
  for each row execute function public.budget_guard();
create trigger budget_updated_at before update on public.budget
  for each row execute function public.set_updated_at();
create trigger budget_audit after insert or update or delete on public.budget
  for each row execute function public.audit_row();

alter table public.account enable row level security;
create policy account_select on public.account for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy account_insert on public.account for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy account_update on public.account for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy account_delete on public.account for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.category enable row level security;
create policy category_select on public.category for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy category_insert on public.category for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy category_update on public.category for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy category_delete on public.category for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.entry enable row level security;
create policy entry_select on public.entry for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy entry_insert on public.entry for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy entry_update on public.entry for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy entry_delete on public.entry for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.budget enable row level security;
create policy budget_select on public.budget for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy budget_insert on public.budget for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy budget_update on public.budget for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy budget_delete on public.budget for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

-- Realtime: list pages refresh live when rows change.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.account;
    alter publication supabase_realtime add table public.category;
    alter publication supabase_realtime add table public.entry;
    alter publication supabase_realtime add table public.budget;
  end if;
end $$;

create or replace function public.dashboard_stats(p_org uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'c0', (select coalesce(sum(amount), 0) from public.entry where org_id = p_org and kind = 'expense'),
    'c1', (select coalesce(sum(amount), 0) from public.entry where org_id = p_org and kind = 'income'),
    'c2', (select count(*) from public.entry where org_id = p_org),
    'c3', (select count(*) from public.account where org_id = p_org),
    'c4', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select kind::text as k, count(*) as n from public.entry where org_id = p_org and kind is not null group by 1) s)
  )
$$;
grant execute on function public.dashboard_stats(uuid) to authenticated;
