-- GENERATED from app.spec.yaml by the pipeline. Do not edit by hand.
-- Once this migration is deployed, schema changes go into new, later migrations (see AGENTS.md).

create or replace function public.app_type()
returns text language sql stable as $$ select 'business'::text $$;

-- Shops and sellers are public: visitors see whose catalog they are browsing.
create policy organizations_select_public on public.organizations for select to anon, authenticated using (not personal);

-- Category (access: public) ----------------------------------------
create table public.category (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_name_req check (char_length(btrim(name)) > 0),
  constraint category_name_len check (char_length(name) <= 500),
  constraint category_description_len check (char_length(description) <= 20000),
  constraint category_name_key unique (org_id, name)
);

-- Bouquet (access: public) ----------------------------------------
create table public.bouquet (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  price numeric(14,2) not null,
  category_id uuid,
  size text not null default 'medium',
  description text,
  stock integer not null default 0,
  available boolean not null default true,
  cover_url text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bouquet_name_req check (char_length(btrim(name)) > 0),
  constraint bouquet_name_len check (char_length(name) <= 500),
  constraint bouquet_price_min check (price >= 0),
  constraint bouquet_size_chk check (size in ('small', 'medium', 'large')),
  constraint bouquet_description_len check (char_length(description) <= 20000),
  constraint bouquet_stock_min check (stock >= 0),
  constraint bouquet_cover_url_len check (char_length(cover_url) <= 2000),
  constraint bouquet_cover_url_chk check (cover_url ~* '^https?://')
);

-- Review (access: customer) ----------------------------------------
create table public.review (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  bouquet_id uuid not null,
  rating integer not null,
  comment text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_rating_min check (rating >= 1),
  constraint review_rating_max check (rating <= 5),
  constraint review_comment_req check (char_length(btrim(comment)) > 0),
  constraint review_comment_len check (char_length(comment) <= 1000)
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

-- Order (access: customer) ----------------------------------------
create table public.shop_order (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  number integer not null,
  status text not null default 'new',
  payment_method text not null,
  payment_status text not null default 'unpaid',
  total numeric(14,2) not null,
  customer_name text not null,
  phone text not null,
  address text not null,
  delivery_date date not null,
  delivery_time text not null,
  recipient_name text,
  card_message text,
  note text,
  subtotal numeric(14,2) not null,
  delivery_fee numeric(14,2) not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_order_status_chk check (status in ('new', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled')),
  constraint shop_order_payment_method_chk check (payment_method in ('cash', 'click', 'payme')),
  constraint shop_order_payment_status_chk check (payment_status in ('unpaid', 'paid', 'refunded')),
  constraint shop_order_customer_name_req check (char_length(btrim(customer_name)) > 0),
  constraint shop_order_customer_name_len check (char_length(customer_name) <= 500),
  constraint shop_order_phone_req check (char_length(btrim(phone)) > 0),
  constraint shop_order_phone_len check (char_length(phone) <= 40),
  constraint shop_order_address_req check (char_length(btrim(address)) > 0),
  constraint shop_order_address_len check (char_length(address) <= 20000),
  constraint shop_order_delivery_time_chk check (delivery_time in ('morning', 'afternoon', 'evening')),
  constraint shop_order_recipient_name_len check (char_length(recipient_name) <= 500),
  constraint shop_order_card_message_len check (char_length(card_message) <= 300),
  constraint shop_order_note_len check (char_length(note) <= 20000)
);

-- Order item (access: customer) ----------------------------------------
create table public.shop_order_item (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null,
  product_id uuid,
  title text not null,
  unit_price numeric(14,2) not null,
  quantity integer not null,
  line_total numeric(14,2) not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_order_item_title_req check (char_length(btrim(title)) > 0),
  constraint shop_order_item_title_len check (char_length(title) <= 500),
  constraint shop_order_item_quantity_min check (quantity >= 1)
);

-- Foreign keys (added after all tables so relations may point in any direction)

alter table public.category add constraint category_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.bouquet add constraint bouquet_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.bouquet add constraint bouquet_category_id_fkey foreign key (category_id) references public.category(id) on delete set null;

alter table public.review add constraint review_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.review add constraint review_bouquet_id_fkey foreign key (bouquet_id) references public.bouquet(id) on delete cascade;

alter table public.inquiry add constraint inquiry_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.shop_order add constraint shop_order_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.shop_order_item add constraint shop_order_item_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.shop_order_item add constraint shop_order_item_order_id_fkey foreign key (order_id) references public.shop_order(id) on delete cascade;

alter table public.shop_order_item add constraint shop_order_item_product_id_fkey foreign key (product_id) references public.bouquet(id) on delete set null;

-- Indexes

create index category_org_idx on public.category (org_id, created_at desc);

create index category_recent_idx on public.category (created_at desc);

create index bouquet_org_idx on public.bouquet (org_id, created_at desc);

create index bouquet_recent_idx on public.bouquet (created_at desc);

create index bouquet_category_id_idx on public.bouquet (category_id);

create index bouquet_sort_idx on public.bouquet (org_id, name);

create index review_org_idx on public.review (org_id, created_at desc);

create index review_recent_idx on public.review (created_at desc);

create index review_customer_idx on public.review (created_by, created_at desc);

create index review_bouquet_id_idx on public.review (bouquet_id);

create index inquiry_org_idx on public.inquiry (org_id, created_at desc);

create index shop_order_org_idx on public.shop_order (org_id, created_at desc);

create index shop_order_customer_idx on public.shop_order (created_by, created_at desc);

create index shop_order_item_org_idx on public.shop_order_item (org_id, created_at desc);

create index shop_order_item_customer_idx on public.shop_order_item (created_by, created_at desc);

create index shop_order_item_order_id_idx on public.shop_order_item (order_id);

create index shop_order_item_product_id_idx on public.shop_order_item (product_id);

create or replace function public.category_guard()
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

create trigger category_guard before insert or update on public.category
  for each row execute function public.category_guard();
create trigger category_updated_at before update on public.category
  for each row execute function public.set_updated_at();
create trigger category_audit after insert or update or delete on public.category
  for each row execute function public.audit_row();

create or replace function public.bouquet_guard()
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
  if new.category_id is not null and not exists (select 1 from public.category where id = new.category_id) then
    raise exception 'Category must point to a category you can access' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger bouquet_guard before insert or update on public.bouquet
  for each row execute function public.bouquet_guard();
create trigger bouquet_updated_at before update on public.bouquet
  for each row execute function public.set_updated_at();
create trigger bouquet_audit after insert or update or delete on public.bouquet
  for each row execute function public.audit_row();

create or replace function public.review_guard()
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
  if new.bouquet_id is not null and not exists (select 1 from public.bouquet where id = new.bouquet_id) then
    raise exception 'Bouquet must point to a bouquet you can access' using errcode = '23503';
  end if;
  if tg_op = 'INSERT' and current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    perform public.limit_submissions('review', 'customer');
  end if;
  return new;
end $$;

create trigger review_guard before insert or update on public.review
  for each row execute function public.review_guard();
create trigger review_updated_at before update on public.review
  for each row execute function public.set_updated_at();
create trigger review_audit after insert or update or delete on public.review
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

create or replace function public.shop_order_guard()
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
  -- Order #: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.number := null; else new.number := old.number; end if;
  end if;
  -- Status: set only by staff
  if current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    if tg_op = 'INSERT' then new.status := 'new'; else new.status := old.status; end if;
  end if;
  -- Payment: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.payment_method := null; else new.payment_method := old.payment_method; end if;
  end if;
  -- Paid: set only by staff
  if current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    if tg_op = 'INSERT' then new.payment_status := 'unpaid'; else new.payment_status := old.payment_status; end if;
  end if;
  -- Total: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.total := null; else new.total := old.total; end if;
  end if;
  -- Customer: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.customer_name := null; else new.customer_name := old.customer_name; end if;
  end if;
  -- Phone: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.phone := null; else new.phone := old.phone; end if;
  end if;
  -- Address: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.address := null; else new.address := old.address; end if;
  end if;
  -- Delivery date: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.delivery_date := null; else new.delivery_date := old.delivery_date; end if;
  end if;
  -- Delivery time: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.delivery_time := null; else new.delivery_time := old.delivery_time; end if;
  end if;
  -- Recipient: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.recipient_name := null; else new.recipient_name := old.recipient_name; end if;
  end if;
  -- Card message: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.card_message := null; else new.card_message := old.card_message; end if;
  end if;
  -- Note: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.note := null; else new.note := old.note; end if;
  end if;
  -- Subtotal: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.subtotal := null; else new.subtotal := old.subtotal; end if;
  end if;
  -- Delivery fee: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.delivery_fee := null; else new.delivery_fee := old.delivery_fee; end if;
  end if;
  return new;
end $$;

create trigger shop_order_guard before insert or update on public.shop_order
  for each row execute function public.shop_order_guard();
create trigger shop_order_updated_at before update on public.shop_order
  for each row execute function public.set_updated_at();
create trigger shop_order_audit after insert or update or delete on public.shop_order
  for each row execute function public.audit_row();

create or replace function public.shop_order_item_guard()
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
  -- Order: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.order_id := null; else new.order_id := old.order_id; end if;
  end if;
  -- Product: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.product_id := null; else new.product_id := old.product_id; end if;
  end if;
  -- Item: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.title := null; else new.title := old.title; end if;
  end if;
  -- Price: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.unit_price := null; else new.unit_price := old.unit_price; end if;
  end if;
  -- Quantity: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.quantity := null; else new.quantity := old.quantity; end if;
  end if;
  -- Total: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.line_total := null; else new.line_total := old.line_total; end if;
  end if;
  if new.order_id is not null and not exists (select 1 from public.shop_order where id = new.order_id and org_id = new.org_id) then
    raise exception 'Order must point to a order you can access' using errcode = '23503';
  end if;
  if new.order_id is not null and not public.has_org_role(new.org_id, 'viewer')
    and not exists (select 1 from public.shop_order where id = new.order_id and created_by = auth.uid()) then
    raise exception 'Order must be one of your own orders' using errcode = '42501';
  end if;
  if new.product_id is not null and not exists (select 1 from public.bouquet where id = new.product_id) then
    raise exception 'Product must point to a bouquet you can access' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger shop_order_item_guard before insert or update on public.shop_order_item
  for each row execute function public.shop_order_item_guard();
create trigger shop_order_item_updated_at before update on public.shop_order_item
  for each row execute function public.set_updated_at();
create trigger shop_order_item_audit after insert or update or delete on public.shop_order_item
  for each row execute function public.audit_row();

alter table public.category enable row level security;
create policy category_select on public.category for select to anon, authenticated
  using (true);
create policy category_insert on public.category for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy category_update on public.category for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy category_delete on public.category for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.bouquet enable row level security;
create policy bouquet_select on public.bouquet for select to anon, authenticated
  using (available or public.has_org_role(org_id, 'viewer'));
create policy bouquet_insert on public.bouquet for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy bouquet_update on public.bouquet for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy bouquet_delete on public.bouquet for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.review enable row level security;
create policy review_select on public.review for select to authenticated
  using (created_by = (select auth.uid()) or public.has_org_role(org_id, 'viewer'));
create policy review_select_public on public.review for select to anon, authenticated
  using (true);
create policy review_insert on public.review for insert to authenticated
  with check (public.has_org_role(org_id, 'member') or public.accepts_customers(org_id));
create policy review_update on public.review for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy review_delete on public.review for delete to authenticated
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

alter table public.shop_order enable row level security;
create policy shop_order_select on public.shop_order for select to authenticated
  using (created_by = (select auth.uid()) or public.has_org_role(org_id, 'viewer'));
create policy shop_order_update on public.shop_order for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy shop_order_delete on public.shop_order for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.shop_order_item enable row level security;
create policy shop_order_item_select on public.shop_order_item for select to authenticated
  using (created_by = (select auth.uid()) or public.has_org_role(org_id, 'viewer'));
create policy shop_order_item_update on public.shop_order_item for update to authenticated
  using (public.has_org_role(org_id, 'owner'))
  with check (public.has_org_role(org_id, 'owner'));
create policy shop_order_item_delete on public.shop_order_item for delete to authenticated
  using (public.has_org_role(org_id, 'owner'));

create or replace function public.is_customer_of_mine(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.review where created_by = p_user and public.has_org_role(org_id, 'viewer'))
    or exists (select 1 from public.shop_order where created_by = p_user and public.has_org_role(org_id, 'viewer'))
    or exists (select 1 from public.shop_order_item where created_by = p_user and public.has_org_role(org_id, 'viewer'))
$$;
create policy profiles_select_customers on public.profiles for select to authenticated using (public.is_customer_of_mine(id));

-- Checkout ---------------------------------------------------------------
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
  if p_details ->> 'payment_method' is not null and p_details ->> 'payment_method' not in ('cash', 'click', 'payme') then
    raise exception 'This payment method is not available' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_details ->> 'customer_name', '')), '') is null then
    raise exception 'Enter your name' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_details ->> 'phone', '')), '') is null then
    raise exception 'Enter a phone number' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_details ->> 'address', '')), '') is null then
    raise exception 'Enter a delivery address' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_details ->> 'delivery_date', '')), '') is null then
    raise exception 'Enter delivery date' using errcode = 'P0001';
  end if;
  if nullif(btrim(coalesce(p_details ->> 'delivery_time', '')), '') is null then
    raise exception 'Enter delivery time' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
             where i.product_id is null or i.quantity is null or i.quantity < 1 or i.quantity > 999) then
    raise exception 'Each item needs a quantity between 1 and 999' using errcode = 'P0001';
  end if;

  select count(distinct i.product_id) into v_requested from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int);
  select count(*) into v_found from public.bouquet p
    where p.id in (select i.product_id from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)) and p.available;
  if v_found <> v_requested then
    raise exception 'Some products in your cart are no longer available' using errcode = 'P0001';
  end if;

  for v_org in
    select distinct p.org_id from public.bouquet p
    where p.id in (select i.product_id from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int))
    order by p.org_id
  loop
    insert into public.shop_order (org_id, number, status, payment_method, payment_status, customer_name, phone, address, note,
      delivery_date, delivery_time, recipient_name, card_message, subtotal, delivery_fee, total)
    values (v_org, nextval('public.shop_order_number_seq'), 'new', coalesce(p_details ->> 'payment_method', 'cash'), 'unpaid',
      btrim(p_details ->> 'customer_name'), btrim(p_details ->> 'phone'), btrim(p_details ->> 'address'), nullif(btrim(p_details ->> 'note'), ''),
      nullif(p_details ->> 'delivery_date', '')::date, nullif(btrim(p_details ->> 'delivery_time'), ''), nullif(btrim(p_details ->> 'recipient_name'), ''), nullif(btrim(p_details ->> 'card_message'), ''), 0, 0, 0)
    returning id into v_order;

    v_sub := 0;
    for v_line in
      select p.id, p.name as title, p.price as price, sum(i.quantity)::int as qty
      from jsonb_to_recordset(p_items) as i(product_id uuid, quantity int)
      join public.bouquet p on p.id = i.product_id
      where p.org_id = v_org
      group by p.id, p.name, p.price
    loop
      update public.bouquet set stock = stock - v_line.qty where id = v_line.id and stock >= v_line.qty;
      if not found then
        raise exception '% is out of stock', v_line.title using errcode = 'P0001';
      end if;
      insert into public.shop_order_item (org_id, order_id, product_id, title, unit_price, quantity, line_total)
      values (v_org, v_order, v_line.id, v_line.title, v_line.price, v_line.qty, v_line.price * v_line.qty);
      v_sub := v_sub + v_line.price * v_line.qty;
    end loop;

    v_fee := case when v_sub >= 500000 then 0 else 30000 end;
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
  update public.bouquet pr set stock = pr.stock + i.quantity
  from public.shop_order_item i
  where i.order_id = new.id and i.product_id = pr.id;
  end if;
  return new;
end $$;

create trigger shop_order_status_change before update of status on public.shop_order
  for each row execute function public.shop_order_status_change();

create table public.payment_event (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_order(id) on delete cascade,
  provider text not null,
  external_id text not null,
  amount numeric(14,2) not null,
  state text not null default 'created',
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_id)
);
create index payment_event_order_idx on public.payment_event(order_id);
alter table public.payment_event enable row level security;
-- No policies: apps never touch this table.

create or replace function public.confirm_payment(p_order uuid, p_provider text, p_external_id text, p_amount numeric, p_payload jsonb default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_order public.shop_order;
begin
  select * into v_order from public.shop_order where id = p_order for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'This order was cancelled' using errcode = 'P0001';
  end if;
  if p_amount <> v_order.total then
    raise exception 'Paid amount % does not match order total %', p_amount, v_order.total using errcode = 'P0001';
  end if;
  insert into public.payment_event (order_id, provider, external_id, amount, state, payload)
  values (p_order, p_provider, p_external_id, p_amount, 'paid', p_payload)
  on conflict (provider, external_id) do update set state = 'paid', updated_at = now();
  if v_order.payment_status <> 'paid' then
    update public.shop_order set payment_status = 'paid' where id = p_order;
  end if;
  return 'paid';
end $$;

revoke execute on function public.confirm_payment(uuid, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_payment(uuid, text, text, numeric, jsonb) to service_role;
grant all on public.payment_event to service_role;
revoke all on public.payment_event from anon, authenticated;

-- Realtime: lists refresh live when rows change.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.category;
    alter publication supabase_realtime add table public.bouquet;
    alter publication supabase_realtime add table public.review;
    alter publication supabase_realtime add table public.inquiry;
    alter publication supabase_realtime add table public.shop_order;
  end if;
end $$;

create or replace function public.dashboard_stats(p_org uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'c0', (select count(*) from public.shop_order where org_id = p_org and status = 'new'),
    'c1', (select coalesce(sum(total), 0) from public.shop_order where org_id = p_org and payment_status = 'paid'),
    'c2', (select count(*) from public.bouquet where org_id = p_org),
    'c3', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select status::text as k, count(*) as n from public.shop_order where org_id = p_org and status is not null group by 1) s)
  )
$$;
grant execute on function public.dashboard_stats(uuid) to authenticated;
