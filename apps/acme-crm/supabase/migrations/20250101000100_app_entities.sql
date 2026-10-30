-- GENERATED from app.spec.yaml by the pipeline. Do not edit by hand.
-- Once this migration is deployed, schema changes go into new, later migrations (see AGENTS.md).

create or replace function public.app_type()
returns text language sql stable as $$ select 'team'::text $$;

-- Company (access: team) ----------------------------------------
create table public.company (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  industry text,
  website text,
  phone text,
  employees integer,
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_name_req check (char_length(btrim(name)) > 0),
  constraint company_name_len check (char_length(name) <= 500),
  constraint company_industry_chk check (industry in ('software', 'retail', 'healthcare', 'manufacturing', 'finance', 'other')),
  constraint company_website_len check (char_length(website) <= 2000),
  constraint company_website_chk check (website ~* '^https?://'),
  constraint company_phone_len check (char_length(phone) <= 40),
  constraint company_employees_min check (employees >= 0),
  constraint company_notes_len check (char_length(notes) <= 20000),
  constraint company_name_key unique (org_id, name)
);

-- Contact (access: team) ----------------------------------------
create table public.contact (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  job_title text,
  company_id uuid,
  status text default 'lead',
  owner_id uuid default auth.uid(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_full_name_req check (char_length(btrim(full_name)) > 0),
  constraint contact_full_name_len check (char_length(full_name) <= 500),
  constraint contact_email_len check (char_length(email) <= 320),
  constraint contact_email_chk check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint contact_phone_len check (char_length(phone) <= 40),
  constraint contact_job_title_len check (char_length(job_title) <= 500),
  constraint contact_status_chk check (status in ('lead', 'customer', 'churned'))
);

-- Deal (access: team) ----------------------------------------
create table public.deal (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  company_id uuid not null,
  contact_id uuid,
  amount numeric(14,2),
  stage text default 'lead',
  probability numeric(5,2),
  close_date date,
  owner_id uuid default auth.uid(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deal_title_req check (char_length(btrim(title)) > 0),
  constraint deal_title_len check (char_length(title) <= 500),
  constraint deal_amount_min check (amount >= 0),
  constraint deal_stage_chk check (stage in ('lead', 'qualified', 'proposal', 'won', 'lost')),
  constraint deal_probability_min check (probability >= 0),
  constraint deal_probability_max check (probability <= 100)
);

-- Task (access: team) ----------------------------------------
create table public.task (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  priority text default 'normal',
  deal_id uuid,
  assignee_id uuid default auth.uid(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_title_req check (char_length(btrim(title)) > 0),
  constraint task_title_len check (char_length(title) <= 500),
  constraint task_priority_chk check (priority in ('low', 'normal', 'high'))
);

-- Foreign keys (added after all tables so relations may point in any direction)

alter table public.company add constraint company_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.contact add constraint contact_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.contact add constraint contact_company_id_fkey foreign key (company_id) references public.company(id) on delete set null;

alter table public.contact add constraint contact_owner_id_fkey foreign key (owner_id) references public.profiles(id) on delete set null;

alter table public.deal add constraint deal_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.deal add constraint deal_company_id_fkey foreign key (company_id) references public.company(id) on delete restrict;

alter table public.deal add constraint deal_contact_id_fkey foreign key (contact_id) references public.contact(id) on delete set null;

alter table public.deal add constraint deal_owner_id_fkey foreign key (owner_id) references public.profiles(id) on delete set null;

alter table public.task add constraint task_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.task add constraint task_deal_id_fkey foreign key (deal_id) references public.deal(id) on delete cascade;

alter table public.task add constraint task_assignee_id_fkey foreign key (assignee_id) references public.profiles(id) on delete set null;

-- Indexes

create index company_org_idx on public.company (org_id, created_at desc);

create index contact_org_idx on public.contact (org_id, created_at desc);

create index contact_company_id_idx on public.contact (company_id);

create index contact_owner_id_idx on public.contact (owner_id);

create index deal_org_idx on public.deal (org_id, created_at desc);

create index deal_company_id_idx on public.deal (company_id);

create index deal_contact_id_idx on public.deal (contact_id);

create index deal_owner_id_idx on public.deal (owner_id);

create index deal_sort_idx on public.deal (org_id, close_date);

create index task_org_idx on public.task (org_id, created_at desc);

create index task_deal_id_idx on public.task (deal_id);

create index task_assignee_id_idx on public.task (assignee_id);

create index task_sort_idx on public.task (org_id, due_date);

create or replace function public.company_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.org_id <> old.org_id then
      raise exception 'Records cannot move between workspaces' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  elsif current_user in ('anon', 'authenticated') then
    -- Apps cannot claim to be someone else; visitors create anonymous rows.
    new.created_by := auth.uid();
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;

  return new;
end $$;

create trigger company_guard before insert or update on public.company
  for each row execute function public.company_guard();
create trigger company_updated_at before update on public.company
  for each row execute function public.set_updated_at();
create trigger company_audit after insert or update or delete on public.company
  for each row execute function public.audit_row();

create or replace function public.contact_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.org_id <> old.org_id then
      raise exception 'Records cannot move between workspaces' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  elsif current_user in ('anon', 'authenticated') then
    -- Apps cannot claim to be someone else; visitors create anonymous rows.
    new.created_by := auth.uid();
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
  if new.company_id is not null and not exists (select 1 from public.company where id = new.company_id and org_id = new.org_id) then
    raise exception 'Company must point to a company you can access' using errcode = '23503';
  end if;
  if new.owner_id is not null and not exists (select 1 from public.memberships where user_id = new.owner_id and org_id = new.org_id) then
    raise exception 'Owner must be a member of this workspace' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger contact_guard before insert or update on public.contact
  for each row execute function public.contact_guard();
create trigger contact_updated_at before update on public.contact
  for each row execute function public.set_updated_at();
create trigger contact_audit after insert or update or delete on public.contact
  for each row execute function public.audit_row();

create or replace function public.deal_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.org_id <> old.org_id then
      raise exception 'Records cannot move between workspaces' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  elsif current_user in ('anon', 'authenticated') then
    -- Apps cannot claim to be someone else; visitors create anonymous rows.
    new.created_by := auth.uid();
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
  if new.company_id is not null and not exists (select 1 from public.company where id = new.company_id and org_id = new.org_id) then
    raise exception 'Company must point to a company you can access' using errcode = '23503';
  end if;
  if new.contact_id is not null and not exists (select 1 from public.contact where id = new.contact_id and org_id = new.org_id) then
    raise exception 'Contact must point to a contact you can access' using errcode = '23503';
  end if;
  if new.owner_id is not null and not exists (select 1 from public.memberships where user_id = new.owner_id and org_id = new.org_id) then
    raise exception 'Owner must be a member of this workspace' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger deal_guard before insert or update on public.deal
  for each row execute function public.deal_guard();
create trigger deal_updated_at before update on public.deal
  for each row execute function public.set_updated_at();
create trigger deal_audit after insert or update or delete on public.deal
  for each row execute function public.audit_row();

create or replace function public.task_guard()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.org_id <> old.org_id then
      raise exception 'Records cannot move between workspaces' using errcode = '42501';
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  elsif current_user in ('anon', 'authenticated') then
    -- Apps cannot claim to be someone else; visitors create anonymous rows.
    new.created_by := auth.uid();
  else
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
  if new.deal_id is not null and not exists (select 1 from public.deal where id = new.deal_id and org_id = new.org_id) then
    raise exception 'Deal must point to a deal you can access' using errcode = '23503';
  end if;
  if new.assignee_id is not null and not exists (select 1 from public.memberships where user_id = new.assignee_id and org_id = new.org_id) then
    raise exception 'Assignee must be a member of this workspace' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger task_guard before insert or update on public.task
  for each row execute function public.task_guard();
create trigger task_updated_at before update on public.task
  for each row execute function public.set_updated_at();
create trigger task_audit after insert or update or delete on public.task
  for each row execute function public.audit_row();

alter table public.company enable row level security;
create policy company_select on public.company for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy company_insert on public.company for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy company_update on public.company for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy company_delete on public.company for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.contact enable row level security;
create policy contact_select on public.contact for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy contact_insert on public.contact for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy contact_update on public.contact for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy contact_delete on public.contact for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.deal enable row level security;
create policy deal_select on public.deal for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy deal_insert on public.deal for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy deal_update on public.deal for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy deal_delete on public.deal for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.task enable row level security;
create policy task_select on public.task for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy task_insert on public.task for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy task_update on public.task for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy task_delete on public.task for delete to authenticated
  using (public.has_org_role(org_id, 'member') and (created_by = (select auth.uid()) or public.has_org_role(org_id, 'admin')));

-- Realtime: lists refresh live when rows change.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.company;
    alter publication supabase_realtime add table public.contact;
    alter publication supabase_realtime add table public.deal;
    alter publication supabase_realtime add table public.task;
  end if;
end $$;

create or replace function public.dashboard_stats(p_org uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'c0', (select count(*) from public.deal where org_id = p_org and stage in ('lead', 'qualified', 'proposal')),
    'c1', (select coalesce(sum(amount), 0) from public.deal where org_id = p_org and stage in ('lead', 'qualified', 'proposal')),
    'c2', (select coalesce(sum(amount), 0) from public.deal where org_id = p_org and stage = 'won'),
    'c3', (select count(*) from public.task where org_id = p_org and done = false),
    'c4', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select stage::text as k, count(*) as n from public.deal where org_id = p_org and stage is not null group by 1) s),
    'c5', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select status::text as k, count(*) as n from public.contact where org_id = p_org and status is not null group by 1) s)
  )
$$;
grant execute on function public.dashboard_stats(uuid) to authenticated;
