-- Core schema shared by every generated app. Do not edit in an app; change it in the pipeline template.
-- Tenancy: every business row belongs to an organization (a team workspace, or a personal one in
-- user-tenancy apps). Access is decided by the caller's role in that organization.

create type public.org_role as enum ('viewer', 'member', 'admin', 'owner');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  personal boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  avatar_url text check (char_length(avatar_url) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index memberships_user_idx on public.memberships(user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.org_role not null default 'member' check (role <> 'owner'),
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  invited_by uuid default auth.uid() references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz
);
create index invitations_org_idx on public.invitations(org_id);

create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations(id) on delete cascade,
  table_name text not null,
  record_id uuid,
  action text not null,
  actor_id uuid,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_record_idx on public.audit_log(org_id, table_name, record_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Access helpers. security definer so policies can read memberships without recursion.
-- ---------------------------------------------------------------------------
create or replace function public.has_org_role(p_org uuid, p_min public.org_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships
    where org_id = p_org and user_id = auth.uid() and role >= p_min
  )
$$;

create or replace function public.shares_org(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships a
    join public.memberships b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = p_user
  )
$$;

create or replace function public.try_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

-- ---------------------------------------------------------------------------
-- Shared triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_org uuid := (v_row ->> 'org_id')::uuid;
  v_changes jsonb;
begin
  -- Rows removed by an organization delete cascade have nowhere to log to.
  if not exists (select 1 from public.organizations where id = v_org) then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    select jsonb_object_agg(n.key, n.value) into v_changes
    from jsonb_each(to_jsonb(new)) n
    where to_jsonb(old) -> n.key is distinct from n.value and n.key <> 'updated_at';
    if v_changes is null then return new; end if;
  else
    v_changes := v_row;
  end if;
  insert into public.audit_log (org_id, table_name, record_id, action, actor_id, changes)
  values (v_org, tg_table_name, (v_row ->> 'id')::uuid, lower(tg_op), auth.uid(), v_changes);
  return coalesce(new, old);
end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- An organization always keeps at least one owner.
create or replace function public.protect_last_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner'
    and (tg_op = 'DELETE' or new.role <> 'owner')
    and exists (select 1 from public.organizations where id = old.org_id)
    and not exists (
      select 1 from public.memberships
      where org_id = old.org_id and role = 'owner' and user_id <> old.user_id
    ) then
    raise exception 'An organization needs at least one owner' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;

create trigger memberships_protect_last_owner before update or delete on public.memberships
  for each row execute function public.protect_last_owner();

-- ---------------------------------------------------------------------------
-- Sign-up: create the profile, then run the app hook (user-tenancy apps create a personal workspace there).
-- ---------------------------------------------------------------------------
create or replace function public.after_signup(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Replaced by the generated migration when the app needs it.
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  perform public.after_signup(new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(p_name text, p_personal boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into public.organizations (name, personal, created_by)
  values (trim(p_name), p_personal, auth.uid()) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  return v_org;
end $$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_inv public.invitations;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  select * into v_inv from public.invitations
  where token = p_token and accepted_at is null and expires_at > now();
  if not found then
    raise exception 'This invitation is invalid or has expired' using errcode = 'P0002';
  end if;
  if lower(v_inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;
  insert into public.memberships (org_id, user_id, role)
  values (v_inv.org_id, auth.uid(), v_inv.role)
  on conflict (org_id, user_id) do nothing;
  update public.invitations set accepted_at = now() where id = v_inv.id;
  return v_inv.org_id;
end $$;

-- What an invite link shows before the visitor joins.
create or replace function public.invitation_preview(p_token text)
returns table (org_name text, email text, role public.org_role, expired boolean)
language sql stable security definer set search_path = '' as $$
  select o.name, i.email, i.role, (i.accepted_at is not null or i.expires_at <= now())
  from public.invitations i join public.organizations o on o.id = i.org_id
  where i.token = p_token
$$;

revoke execute on function public.after_signup(uuid) from public, anon, authenticated;
revoke execute on function public.create_organization(text, boolean) from public, anon;
revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.create_organization(text, boolean) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_log enable row level security;

create policy organizations_select on public.organizations for select to authenticated
  using (public.has_org_role(id, 'viewer'));
create policy organizations_update on public.organizations for update to authenticated
  using (public.has_org_role(id, 'admin')) with check (public.has_org_role(id, 'admin'));
create policy organizations_delete on public.organizations for delete to authenticated
  using (public.has_org_role(id, 'owner') and not personal);

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_org(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy memberships_select on public.memberships for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
-- Admins manage members; only owners may touch owners.
create policy memberships_update on public.memberships for update to authenticated
  using (public.has_org_role(org_id, 'admin') and (role <> 'owner' or public.has_org_role(org_id, 'owner')))
  with check (public.has_org_role(org_id, 'admin') and (role <> 'owner' or public.has_org_role(org_id, 'owner')));
create policy memberships_delete on public.memberships for delete to authenticated
  using (
    user_id = (select auth.uid())
    or (public.has_org_role(org_id, 'admin') and (role <> 'owner' or public.has_org_role(org_id, 'owner')))
  );

create policy invitations_select on public.invitations for select to authenticated
  using (public.has_org_role(org_id, 'admin'));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (public.has_org_role(org_id, 'admin'));
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

create policy audit_log_select on public.audit_log for select to authenticated
  using (public.has_org_role(org_id, 'admin'));

-- ---------------------------------------------------------------------------
-- File storage: objects live under <org_id>/<table>/<record_id>/<file>.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do nothing;

create policy attachments_select on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and public.has_org_role(public.try_uuid((storage.foldername(name))[1]), 'viewer'));
create policy attachments_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and public.has_org_role(public.try_uuid((storage.foldername(name))[1]), 'member'));
create policy attachments_delete on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and public.has_org_role(public.try_uuid((storage.foldername(name))[1]), 'member'));
