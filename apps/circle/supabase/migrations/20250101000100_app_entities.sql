-- GENERATED from app.spec.yaml by the pipeline. Do not edit by hand.
-- Once this migration is deployed, schema changes go into new, later migrations (see AGENTS.md).

create or replace function public.app_type()
returns text language sql stable as $$ select 'personal'::text $$;

-- Personal apps: every account gets a private workspace at sign-up.
create or replace function public.after_signup(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid;
begin
  insert into public.organizations (name, personal, created_by) values ('Personal', true, p_user) returning id into v_org;
  insert into public.memberships (org_id, user_id, role) values (v_org, p_user, 'owner');
end $$;

-- Shared content shows its author, so names and avatars are visible to every signed-in user.
create policy profiles_select_public on public.profiles for select to authenticated using (true);

-- Post (access: members) ----------------------------------------
create table public.post (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  headline text not null,
  body text not null,
  topic text not null default 'general',
  link text,
  tags text[] not null default '{}',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_headline_req check (char_length(btrim(headline)) > 0),
  constraint post_headline_len check (char_length(headline) <= 140),
  constraint post_body_req check (char_length(btrim(body)) > 0),
  constraint post_body_len check (char_length(body) <= 5000),
  constraint post_topic_chk check (topic in ('general', 'question', 'showcase', 'news')),
  constraint post_link_len check (char_length(link) <= 2000),
  constraint post_link_chk check (link ~* '^https?://')
);

-- Comment (access: members) ----------------------------------------
create table public.comment (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  post_id uuid not null,
  body text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comment_body_req check (char_length(btrim(body)) > 0),
  constraint comment_body_len check (char_length(body) <= 2000)
);

-- Follow (access: members) ----------------------------------------
create table public.follow (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  following_id uuid not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint follow_following_id_key unique (org_id, following_id)
);

-- Bookmark (access: team) ----------------------------------------
create table public.bookmark (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  post_id uuid not null,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookmark_note_len check (char_length(note) <= 500),
  constraint bookmark_post_id_key unique (org_id, post_id)
);

-- Foreign keys (added after all tables so relations may point in any direction)

alter table public.post add constraint post_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.comment add constraint comment_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.comment add constraint comment_post_id_fkey foreign key (post_id) references public.post(id) on delete cascade;

alter table public.follow add constraint follow_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.follow add constraint follow_following_id_fkey foreign key (following_id) references public.profiles(id) on delete restrict;

alter table public.bookmark add constraint bookmark_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.bookmark add constraint bookmark_post_id_fkey foreign key (post_id) references public.post(id) on delete cascade;

-- Indexes

create index post_org_idx on public.post (org_id, created_at desc);

create index post_recent_idx on public.post (created_at desc);

create index comment_org_idx on public.comment (org_id, created_at desc);

create index comment_recent_idx on public.comment (created_at desc);

create index comment_post_id_idx on public.comment (post_id);

create index follow_org_idx on public.follow (org_id, created_at desc);

create index follow_recent_idx on public.follow (created_at desc);

create index follow_following_id_idx on public.follow (following_id);

create index bookmark_org_idx on public.bookmark (org_id, created_at desc);

create index bookmark_post_id_idx on public.bookmark (post_id);

create or replace function public.post_guard()
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

create trigger post_guard before insert or update on public.post
  for each row execute function public.post_guard();
create trigger post_updated_at before update on public.post
  for each row execute function public.set_updated_at();
create trigger post_audit after insert or update or delete on public.post
  for each row execute function public.audit_row();

create or replace function public.comment_guard()
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
  if new.post_id is not null and not exists (select 1 from public.post where id = new.post_id) then
    raise exception 'Post must point to a post you can access' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger comment_guard before insert or update on public.comment
  for each row execute function public.comment_guard();
create trigger comment_updated_at before update on public.comment
  for each row execute function public.set_updated_at();
create trigger comment_audit after insert or update or delete on public.comment
  for each row execute function public.audit_row();

create or replace function public.follow_guard()
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

create trigger follow_guard before insert or update on public.follow
  for each row execute function public.follow_guard();
create trigger follow_updated_at before update on public.follow
  for each row execute function public.set_updated_at();
create trigger follow_audit after insert or update or delete on public.follow
  for each row execute function public.audit_row();

create or replace function public.bookmark_guard()
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
  if new.post_id is not null and not exists (select 1 from public.post where id = new.post_id) then
    raise exception 'Post must point to a post you can access' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger bookmark_guard before insert or update on public.bookmark
  for each row execute function public.bookmark_guard();
create trigger bookmark_updated_at before update on public.bookmark
  for each row execute function public.set_updated_at();
create trigger bookmark_audit after insert or update or delete on public.bookmark
  for each row execute function public.audit_row();

alter table public.post enable row level security;
create policy post_select on public.post for select to authenticated
  using (true);
create policy post_insert on public.post for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy post_update on public.post for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy post_delete on public.post for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.comment enable row level security;
create policy comment_select on public.comment for select to authenticated
  using (true);
create policy comment_insert on public.comment for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy comment_update on public.comment for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy comment_delete on public.comment for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.follow enable row level security;
create policy follow_select on public.follow for select to authenticated
  using (true);
create policy follow_insert on public.follow for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy follow_update on public.follow for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy follow_delete on public.follow for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.bookmark enable row level security;
create policy bookmark_select on public.bookmark for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy bookmark_insert on public.bookmark for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy bookmark_update on public.bookmark for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy bookmark_delete on public.bookmark for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

-- Realtime: lists refresh live when rows change.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.post;
    alter publication supabase_realtime add table public.comment;
    alter publication supabase_realtime add table public.follow;
    alter publication supabase_realtime add table public.bookmark;
  end if;
end $$;

create or replace function public.dashboard_stats(p_org uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'c0', (select count(*) from public.post where org_id = p_org),
    'c1', (select count(*) from public.comment where org_id = p_org),
    'c2', (select count(*) from public.follow where org_id = p_org),
    'c3', (select count(*) from public.bookmark where org_id = p_org),
    'c4', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select topic::text as k, count(*) as n from public.post where org_id = p_org and topic is not null group by 1) s)
  )
$$;
grant execute on function public.dashboard_stats(uuid) to authenticated;
