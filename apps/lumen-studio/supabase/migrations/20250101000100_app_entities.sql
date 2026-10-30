-- GENERATED from app.spec.yaml by the pipeline. Do not edit by hand.
-- Once this migration is deployed, schema changes go into new, later migrations (see AGENTS.md).

create or replace function public.app_type()
returns text language sql stable as $$ select 'business'::text $$;

-- Shops and sellers are public: visitors see whose catalog they are browsing.
create policy organizations_select_public on public.organizations for select to anon, authenticated using (not personal);

-- Service (access: public) ----------------------------------------
create table public.service (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null default 'hair',
  price numeric(14,2) not null,
  duration_minutes integer not null default 60,
  description text,
  cover_url text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_name_req check (char_length(btrim(name)) > 0),
  constraint service_name_len check (char_length(name) <= 500),
  constraint service_category_chk check (category in ('hair', 'nails', 'skin', 'makeup')),
  constraint service_price_min check (price >= 0),
  constraint service_duration_minutes_min check (duration_minutes >= 15),
  constraint service_duration_minutes_max check (duration_minutes <= 480),
  constraint service_description_len check (char_length(description) <= 20000),
  constraint service_cover_url_len check (char_length(cover_url) <= 2000),
  constraint service_cover_url_chk check (cover_url ~* '^https?://')
);

-- Specialist (access: public) ----------------------------------------
create table public.specialist (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  role text not null,
  bio text,
  cover_url text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint specialist_name_req check (char_length(btrim(name)) > 0),
  constraint specialist_name_len check (char_length(name) <= 500),
  constraint specialist_role_req check (char_length(btrim(role)) > 0),
  constraint specialist_role_len check (char_length(role) <= 120),
  constraint specialist_bio_len check (char_length(bio) <= 2000),
  constraint specialist_cover_url_len check (char_length(cover_url) <= 2000),
  constraint specialist_cover_url_chk check (cover_url ~* '^https?://')
);

-- Booking (access: customer) ----------------------------------------
create table public.booking (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null,
  specialist_id uuid,
  starts_at timestamptz not null,
  phone text not null,
  note text,
  status text not null default 'requested',
  ends_at timestamptz,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_phone_req check (char_length(btrim(phone)) > 0),
  constraint booking_phone_len check (char_length(phone) <= 40),
  constraint booking_note_len check (char_length(note) <= 500),
  constraint booking_status_chk check (status in ('requested', 'confirmed', 'completed', 'cancelled'))
);

-- Testimonial (access: customer) ----------------------------------------
create table public.testimonial (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  rating integer not null,
  text text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint testimonial_rating_min check (rating >= 1),
  constraint testimonial_rating_max check (rating <= 5),
  constraint testimonial_text_req check (char_length(btrim(text)) > 0),
  constraint testimonial_text_len check (char_length(text) <= 1000)
);

-- Inquiry (access: inbox) ----------------------------------------
create table public.inquiry (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text not null,
  message text not null,
  status text not null default 'new',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inquiry_name_req check (char_length(btrim(name)) > 0),
  constraint inquiry_name_len check (char_length(name) <= 120),
  constraint inquiry_phone_req check (char_length(btrim(phone)) > 0),
  constraint inquiry_phone_len check (char_length(phone) <= 40),
  constraint inquiry_message_req check (char_length(btrim(message)) > 0),
  constraint inquiry_message_len check (char_length(message) <= 2000),
  constraint inquiry_status_chk check (status in ('new', 'answered'))
);

-- Foreign keys (added after all tables so relations may point in any direction)

alter table public.service add constraint service_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.specialist add constraint specialist_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.booking add constraint booking_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.booking add constraint booking_service_id_fkey foreign key (service_id) references public.service(id) on delete restrict;

alter table public.booking add constraint booking_specialist_id_fkey foreign key (specialist_id) references public.specialist(id) on delete set null;

alter table public.testimonial add constraint testimonial_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.inquiry add constraint inquiry_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

-- Indexes

create index service_org_idx on public.service (org_id, created_at desc);

create index service_recent_idx on public.service (created_at desc);

create index service_sort_idx on public.service (org_id, name);

create index specialist_org_idx on public.specialist (org_id, created_at desc);

create index specialist_recent_idx on public.specialist (created_at desc);

create index booking_org_idx on public.booking (org_id, created_at desc);

create index booking_customer_idx on public.booking (created_by, created_at desc);

create index booking_service_id_idx on public.booking (service_id);

create index booking_specialist_id_idx on public.booking (specialist_id);

create index booking_sort_idx on public.booking (org_id, starts_at);

create index testimonial_org_idx on public.testimonial (org_id, created_at desc);

create index testimonial_recent_idx on public.testimonial (created_at desc);

create index testimonial_customer_idx on public.testimonial (created_by, created_at desc);

create index inquiry_org_idx on public.inquiry (org_id, created_at desc);

create or replace function public.service_guard()
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
  -- Cover image: set only by staff
  if current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    if tg_op = 'INSERT' then new.cover_url := null; else new.cover_url := old.cover_url; end if;
  end if;
  return new;
end $$;

create trigger service_guard before insert or update on public.service
  for each row execute function public.service_guard();
create trigger service_updated_at before update on public.service
  for each row execute function public.set_updated_at();
create trigger service_audit after insert or update or delete on public.service
  for each row execute function public.audit_row();

create or replace function public.specialist_guard()
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
  -- Cover image: set only by staff
  if current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    if tg_op = 'INSERT' then new.cover_url := null; else new.cover_url := old.cover_url; end if;
  end if;
  return new;
end $$;

create trigger specialist_guard before insert or update on public.specialist
  for each row execute function public.specialist_guard();
create trigger specialist_updated_at before update on public.specialist
  for each row execute function public.set_updated_at();
create trigger specialist_audit after insert or update or delete on public.specialist
  for each row execute function public.audit_row();

create or replace function public.booking_guard()
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
  -- Status: set only by staff
  if current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    if tg_op = 'INSERT' then new.status := 'requested'; else new.status := old.status; end if;
  end if;
  -- Ends: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.ends_at := null; else new.ends_at := old.ends_at; end if;
  end if;
  if new.service_id is not null and not exists (select 1 from public.service where id = new.service_id) then
    raise exception 'Service must point to a service you can access' using errcode = '23503';
  end if;
  if new.specialist_id is not null and not exists (select 1 from public.specialist where id = new.specialist_id) then
    raise exception 'Specialist must point to a specialist you can access' using errcode = '23503';
  end if;
  if tg_op = 'INSERT' and current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    perform public.limit_submissions('booking', 'customer');
  end if;
  return new;
end $$;

create trigger booking_guard before insert or update on public.booking
  for each row execute function public.booking_guard();
create trigger booking_updated_at before update on public.booking
  for each row execute function public.set_updated_at();
create trigger booking_audit after insert or update or delete on public.booking
  for each row execute function public.audit_row();

create or replace function public.testimonial_guard()
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
  if tg_op = 'INSERT' and current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    perform public.limit_submissions('testimonial', 'customer');
  end if;
  return new;
end $$;

create trigger testimonial_guard before insert or update on public.testimonial
  for each row execute function public.testimonial_guard();
create trigger testimonial_updated_at before update on public.testimonial
  for each row execute function public.set_updated_at();
create trigger testimonial_audit after insert or update or delete on public.testimonial
  for each row execute function public.audit_row();

create or replace function public.inquiry_guard()
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
  -- Status: set only by staff
  if current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    if tg_op = 'INSERT' then new.status := 'new'; else new.status := old.status; end if;
  end if;
  if tg_op = 'INSERT' and current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    perform public.limit_submissions('inquiry', 'inbox');
  end if;
  return new;
end $$;

create trigger inquiry_guard before insert or update on public.inquiry
  for each row execute function public.inquiry_guard();
create trigger inquiry_updated_at before update on public.inquiry
  for each row execute function public.set_updated_at();
create trigger inquiry_audit after insert or update or delete on public.inquiry
  for each row execute function public.audit_row();

alter table public.service enable row level security;
create policy service_select on public.service for select to anon, authenticated
  using (true);
create policy service_insert on public.service for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy service_update on public.service for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy service_delete on public.service for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.specialist enable row level security;
create policy specialist_select on public.specialist for select to anon, authenticated
  using (true);
create policy specialist_insert on public.specialist for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy specialist_update on public.specialist for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy specialist_delete on public.specialist for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.booking enable row level security;
create policy booking_select on public.booking for select to authenticated
  using (created_by = (select auth.uid()) or public.has_org_role(org_id, 'viewer'));
create policy booking_insert on public.booking for insert to authenticated
  with check (public.has_org_role(org_id, 'member') or public.accepts_customers(org_id));
create policy booking_update on public.booking for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy booking_delete on public.booking for delete to authenticated
  using (public.has_org_role(org_id, 'admin') or created_by = (select auth.uid()));

alter table public.testimonial enable row level security;
create policy testimonial_select on public.testimonial for select to authenticated
  using (created_by = (select auth.uid()) or public.has_org_role(org_id, 'viewer'));
create policy testimonial_select_public on public.testimonial for select to anon, authenticated
  using (true);
create policy testimonial_insert on public.testimonial for insert to authenticated
  with check (public.has_org_role(org_id, 'member') or public.accepts_customers(org_id));
create policy testimonial_update on public.testimonial for update to authenticated
  using (public.has_org_role(org_id, 'member') or created_by = (select auth.uid()))
  with check (public.has_org_role(org_id, 'member') or created_by = (select auth.uid()));
create policy testimonial_delete on public.testimonial for delete to authenticated
  using (public.has_org_role(org_id, 'admin') or created_by = (select auth.uid()));

alter table public.inquiry enable row level security;
create policy inquiry_select on public.inquiry for select to authenticated
  using (public.has_org_role(org_id, 'viewer'));
create policy inquiry_insert on public.inquiry for insert to anon, authenticated
  with check (public.accepts_customers(org_id) or public.has_org_role(org_id, 'member'));
create policy inquiry_update on public.inquiry for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy inquiry_delete on public.inquiry for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

create or replace function public.is_customer_of_mine(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.booking where created_by = p_user and public.has_org_role(org_id, 'viewer'))
    or exists (select 1 from public.testimonial where created_by = p_user and public.has_org_role(org_id, 'viewer'))
$$;
create policy profiles_select_customers on public.profiles for select to authenticated using (public.is_customer_of_mine(id));

-- Time slots --------------------------------------------------
create or replace function public.booking_schedule()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_org uuid := new.org_id;
  v_local timestamp := new.starts_at at time zone 'Asia/Tashkent';
  v_minutes int := (select duration_minutes from public.service where id = new.service_id);
begin
  if tg_op = 'UPDATE' and new.starts_at = old.starts_at and old.status not in ('cancelled') = new.status not in ('cancelled') and new.specialist_id is not distinct from old.specialist_id then
    new.ends_at := old.ends_at;
    return new;
  end if;
  new.ends_at := new.starts_at + make_interval(mins => v_minutes);
  if not (new.status not in ('cancelled')) then
    return new;
  end if;
  if tg_op = 'INSERT' and new.starts_at < now() then
    raise exception 'Please choose a time in the future' using errcode = 'P0001';
  end if;
  if v_local::time < '09:00'::time or (new.ends_at at time zone 'Asia/Tashkent')::time > '19:00'::time
    or (new.ends_at at time zone 'Asia/Tashkent')::date <> v_local::date then
    raise exception 'We are open from 09:00 to 19:00' using errcode = 'P0001';
  end if;
  if extract(dow from v_local)::int in (1) then
    raise exception 'We are closed on this day' using errcode = 'P0001';
  end if;
  -- One booking at a time per workspace, so two people can never take the same slot.
  perform pg_advisory_xact_lock(hashtextextended(v_org::text, 0));
  if new.specialist_id is null then
    select r.id into new.specialist_id from public.specialist r
    where r.org_id = new.org_id and not exists (select 1 from public.booking b where b.org_id = v_org and b.status not in ('cancelled') and b.starts_at < new.ends_at and b.ends_at > new.starts_at and b.specialist_id = r.id and b.id <> new.id)
    order by r.created_at limit 1;
    if new.specialist_id is null and exists (select 1 from public.specialist where org_id = new.org_id) then
      raise exception 'This time is fully booked. Please choose another.' using errcode = 'P0001';
    end if;
  end if;
  if exists (select 1 from public.booking b where b.org_id = v_org and b.status not in ('cancelled') and b.starts_at < new.ends_at and b.ends_at > new.starts_at and b.specialist_id is not distinct from new.specialist_id and b.id <> new.id) then
    raise exception 'This time was just booked. Please choose another.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger booking_schedule before insert or update on public.booking
  for each row execute function public.booking_schedule();

-- Starting times still free on one day, in the business's timezone. Reveals availability, never who booked.
create or replace function public.free_slots(p_org uuid, p_day date, p_service uuid, p_resource uuid default null)
returns setof timestamptz language plpgsql stable security definer set search_path = '' as $$
declare
  v_org uuid := p_org;
  v_minutes int := (select duration_minutes from public.service where id = p_service);
  v_slot timestamptz;
  v_end timestamptz;
begin
  if v_minutes is null then return; end if;
  if extract(dow from p_day)::int in (1) then return; end if;
  for v_slot in
    select g at time zone 'Asia/Tashkent'
    from generate_series((p_day + '09:00'::time)::timestamp, (p_day + '19:00'::time)::timestamp - make_interval(mins => v_minutes), make_interval(mins => 30)) g
  loop
    v_end := v_slot + make_interval(mins => v_minutes);
    continue when v_slot <= now();
    if p_resource is not null then
      continue when exists (select 1 from public.booking b where b.org_id = v_org and b.status not in ('cancelled') and b.starts_at < v_end and b.ends_at > v_slot and b.specialist_id = p_resource);
    elsif exists (select 1 from public.specialist where org_id = v_org) then
      continue when not exists (
        select 1 from public.specialist r
        where r.org_id = v_org and not exists (select 1 from public.booking b where b.org_id = v_org and b.status not in ('cancelled') and b.starts_at < v_end and b.ends_at > v_slot and b.specialist_id = r.id)
      );
    else
      continue when exists (select 1 from public.booking b where b.org_id = v_org and b.status not in ('cancelled') and b.starts_at < v_end and b.ends_at > v_slot);
    end if;
    return next v_slot;
  end loop;
end $$;
grant execute on function public.free_slots to anon, authenticated;

-- Realtime: lists refresh live when rows change.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.service;
    alter publication supabase_realtime add table public.specialist;
    alter publication supabase_realtime add table public.booking;
    alter publication supabase_realtime add table public.testimonial;
    alter publication supabase_realtime add table public.inquiry;
  end if;
end $$;

create or replace function public.dashboard_stats(p_org uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'c0', (select count(*) from public.booking where org_id = p_org and status = 'requested'),
    'c1', (select count(*) from public.booking where org_id = p_org and status = 'confirmed'),
    'c2', (select count(*) from public.inquiry where org_id = p_org and status = 'new'),
    'c3', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select status::text as k, count(*) as n from public.booking where org_id = p_org and status is not null group by 1) s)
  )
$$;
grant execute on function public.dashboard_stats(uuid) to authenticated;
