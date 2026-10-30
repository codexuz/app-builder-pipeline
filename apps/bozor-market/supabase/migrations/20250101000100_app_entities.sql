-- GENERATED from app.spec.yaml by the pipeline. Do not edit by hand.
-- Once this migration is deployed, schema changes go into new, later migrations (see AGENTS.md).

create or replace function public.app_type()
returns text language sql stable as $$ select 'marketplace'::text $$;

-- Shops and sellers are public: visitors see whose catalog they are browsing.
create policy organizations_select_public on public.organizations for select to anon, authenticated using (not personal);

-- Product (access: public) ----------------------------------------
create table public.product (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  price numeric(14,2) not null,
  old_price numeric(14,2),
  category text not null default 'home',
  brand text,
  description text,
  stock integer not null default 0,
  active boolean not null default true,
  tags text[] not null default '{}',
  cover_url text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_name_req check (char_length(btrim(name)) > 0),
  constraint product_name_len check (char_length(name) <= 200),
  constraint product_price_min check (price >= 0),
  constraint product_old_price_min check (old_price >= 0),
  constraint product_category_chk check (category in ('electronics', 'clothing', 'shoes', 'home', 'beauty', 'kids', 'food', 'books', 'sports')),
  constraint product_brand_len check (char_length(brand) <= 120),
  constraint product_description_len check (char_length(description) <= 10000),
  constraint product_stock_min check (stock >= 0),
  constraint product_cover_url_len check (char_length(cover_url) <= 2000),
  constraint product_cover_url_chk check (cover_url ~* '^https?://')
);

-- Review (access: customer) ----------------------------------------
create table public.review (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  rating integer not null,
  comment text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_rating_min check (rating >= 1),
  constraint review_rating_max check (rating <= 5),
  constraint review_comment_req check (char_length(btrim(comment)) > 0),
  constraint review_comment_len check (char_length(comment) <= 2000)
);

-- Question (access: customer) ----------------------------------------
create table public.question (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  question text not null,
  answer text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint question_question_req check (char_length(btrim(question)) > 0),
  constraint question_question_len check (char_length(question) <= 1000),
  constraint question_answer_len check (char_length(answer) <= 2000)
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
  constraint shop_order_note_len check (char_length(note) <= 20000)
);

-- Size (access: public) ----------------------------------------
create table public.shop_variant (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null,
  name text not null,
  price numeric(14,2),
  stock integer not null default 0,
  active boolean not null default true,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_variant_name_req check (char_length(btrim(name)) > 0),
  constraint shop_variant_name_len check (char_length(name) <= 80),
  constraint shop_variant_price_min check (price >= 0),
  constraint shop_variant_stock_min check (stock >= 0)
);

-- Order item (access: customer) ----------------------------------------
create table public.shop_order_item (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null,
  product_id uuid,
  variant_id uuid,
  title text not null,
  variant_name text,
  unit_price numeric(14,2) not null,
  quantity integer not null,
  line_total numeric(14,2) not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_order_item_title_req check (char_length(btrim(title)) > 0),
  constraint shop_order_item_title_len check (char_length(title) <= 500),
  constraint shop_order_item_variant_name_len check (char_length(variant_name) <= 500),
  constraint shop_order_item_quantity_min check (quantity >= 1)
);

-- Foreign keys (added after all tables so relations may point in any direction)

alter table public.product add constraint product_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.review add constraint review_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.review add constraint review_product_id_fkey foreign key (product_id) references public.product(id) on delete cascade;

alter table public.question add constraint question_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.question add constraint question_product_id_fkey foreign key (product_id) references public.product(id) on delete cascade;

alter table public.shop_order add constraint shop_order_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.shop_variant add constraint shop_variant_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.shop_variant add constraint shop_variant_product_id_fkey foreign key (product_id) references public.product(id) on delete cascade;

alter table public.shop_order_item add constraint shop_order_item_created_by_fkey foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.shop_order_item add constraint shop_order_item_order_id_fkey foreign key (order_id) references public.shop_order(id) on delete cascade;

alter table public.shop_order_item add constraint shop_order_item_product_id_fkey foreign key (product_id) references public.product(id) on delete set null;

alter table public.shop_order_item add constraint shop_order_item_variant_id_fkey foreign key (variant_id) references public.shop_variant(id) on delete set null;

-- Indexes

create index product_org_idx on public.product (org_id, created_at desc);

create index product_recent_idx on public.product (created_at desc);

create index review_org_idx on public.review (org_id, created_at desc);

create index review_recent_idx on public.review (created_at desc);

create index review_customer_idx on public.review (created_by, created_at desc);

create index review_product_id_idx on public.review (product_id);

create index question_org_idx on public.question (org_id, created_at desc);

create index question_recent_idx on public.question (created_at desc);

create index question_customer_idx on public.question (created_by, created_at desc);

create index question_product_id_idx on public.question (product_id);

create index shop_order_org_idx on public.shop_order (org_id, created_at desc);

create index shop_order_customer_idx on public.shop_order (created_by, created_at desc);

create index shop_variant_org_idx on public.shop_variant (org_id, created_at desc);

create index shop_variant_recent_idx on public.shop_variant (created_at desc);

create index shop_variant_product_id_idx on public.shop_variant (product_id);

create index shop_order_item_org_idx on public.shop_order_item (org_id, created_at desc);

create index shop_order_item_customer_idx on public.shop_order_item (created_by, created_at desc);

create index shop_order_item_order_id_idx on public.shop_order_item (order_id);

create index shop_order_item_product_id_idx on public.shop_order_item (product_id);

create index shop_order_item_variant_id_idx on public.shop_order_item (variant_id);

create or replace function public.product_guard()
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

create trigger product_guard before insert or update on public.product
  for each row execute function public.product_guard();
create trigger product_updated_at before update on public.product
  for each row execute function public.set_updated_at();
create trigger product_audit after insert or update or delete on public.product
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
  if new.product_id is not null and not exists (select 1 from public.product where id = new.product_id) then
    raise exception 'Product must point to a product you can access' using errcode = '23503';
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

create or replace function public.question_guard()
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
  -- Answer: set only by staff
  if current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    if tg_op = 'INSERT' then new.answer := null; else new.answer := old.answer; end if;
  end if;
  if new.product_id is not null and not exists (select 1 from public.product where id = new.product_id) then
    raise exception 'Product must point to a product you can access' using errcode = '23503';
  end if;
  if tg_op = 'INSERT' and current_user in ('anon', 'authenticated') and not public.has_org_role(new.org_id, 'viewer') then
    perform public.limit_submissions('question', 'customer');
  end if;
  return new;
end $$;

create trigger question_guard before insert or update on public.question
  for each row execute function public.question_guard();
create trigger question_updated_at before update on public.question
  for each row execute function public.set_updated_at();
create trigger question_audit after insert or update or delete on public.question
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

create or replace function public.shop_variant_guard()
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
  if new.product_id is not null and not exists (select 1 from public.product where id = new.product_id) then
    raise exception 'Product must point to a product you can access' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger shop_variant_guard before insert or update on public.shop_variant
  for each row execute function public.shop_variant_guard();
create trigger shop_variant_updated_at before update on public.shop_variant
  for each row execute function public.set_updated_at();
create trigger shop_variant_audit after insert or update or delete on public.shop_variant
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
  -- Size: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.variant_id := null; else new.variant_id := old.variant_id; end if;
  end if;
  -- Item: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.title := null; else new.title := old.title; end if;
  end if;
  -- Size: set only by database functions
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then new.variant_name := null; else new.variant_name := old.variant_name; end if;
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
  if new.product_id is not null and not exists (select 1 from public.product where id = new.product_id) then
    raise exception 'Product must point to a product you can access' using errcode = '23503';
  end if;
  if new.variant_id is not null and not exists (select 1 from public.shop_variant where id = new.variant_id) then
    raise exception 'Size must point to a size you can access' using errcode = '23503';
  end if;
  return new;
end $$;

create trigger shop_order_item_guard before insert or update on public.shop_order_item
  for each row execute function public.shop_order_item_guard();
create trigger shop_order_item_updated_at before update on public.shop_order_item
  for each row execute function public.set_updated_at();
create trigger shop_order_item_audit after insert or update or delete on public.shop_order_item
  for each row execute function public.audit_row();

alter table public.product enable row level security;
create policy product_select on public.product for select to anon, authenticated
  using (active or public.has_org_role(org_id, 'viewer'));
create policy product_insert on public.product for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy product_update on public.product for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy product_delete on public.product for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.review enable row level security;
create policy review_select on public.review for select to authenticated
  using (created_by = (select auth.uid()) or public.has_org_role(org_id, 'viewer'));
create policy review_select_public on public.review for select to anon, authenticated
  using (true);
create policy review_insert on public.review for insert to authenticated
  with check (public.has_org_role(org_id, 'member') or public.accepts_customers(org_id));
create policy review_update on public.review for update to authenticated
  using (public.has_org_role(org_id, 'member') or created_by = (select auth.uid()))
  with check (public.has_org_role(org_id, 'member') or created_by = (select auth.uid()));
create policy review_delete on public.review for delete to authenticated
  using (public.has_org_role(org_id, 'admin') or created_by = (select auth.uid()));

alter table public.question enable row level security;
create policy question_select on public.question for select to authenticated
  using (created_by = (select auth.uid()) or public.has_org_role(org_id, 'viewer'));
create policy question_select_public on public.question for select to anon, authenticated
  using (true);
create policy question_insert on public.question for insert to authenticated
  with check (public.has_org_role(org_id, 'member') or public.accepts_customers(org_id));
create policy question_update on public.question for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy question_delete on public.question for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.shop_order enable row level security;
create policy shop_order_select on public.shop_order for select to authenticated
  using (created_by = (select auth.uid()) or public.has_org_role(org_id, 'viewer'));
create policy shop_order_update on public.shop_order for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy shop_order_delete on public.shop_order for delete to authenticated
  using (public.has_org_role(org_id, 'admin'));

alter table public.shop_variant enable row level security;
create policy shop_variant_select on public.shop_variant for select to anon, authenticated
  using (true);
create policy shop_variant_insert on public.shop_variant for insert to authenticated
  with check (public.has_org_role(org_id, 'member'));
create policy shop_variant_update on public.shop_variant for update to authenticated
  using (public.has_org_role(org_id, 'member'))
  with check (public.has_org_role(org_id, 'member'));
create policy shop_variant_delete on public.shop_variant for delete to authenticated
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
    or exists (select 1 from public.question where created_by = p_user and public.has_org_role(org_id, 'viewer'))
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
  if exists (select 1 from jsonb_to_recordset(p_items) as i(product_id uuid, variant_id uuid, quantity int)
             where i.product_id is null or i.quantity is null or i.quantity < 1 or i.quantity > 999) then
    raise exception 'Each item needs a quantity between 1 and 999' using errcode = 'P0001';
  end if;

  select count(distinct i.product_id) into v_requested from jsonb_to_recordset(p_items) as i(product_id uuid, variant_id uuid, quantity int);
  select count(*) into v_found from public.product p
    where p.id in (select i.product_id from jsonb_to_recordset(p_items) as i(product_id uuid, variant_id uuid, quantity int)) and p.active;
  if v_found <> v_requested then
    raise exception 'Some products in your cart are no longer available' using errcode = 'P0001';
  end if;
  -- Products with options must be ordered as one of their available options.
  if exists (
    select 1 from jsonb_to_recordset(p_items) as i(product_id uuid, variant_id uuid, quantity int)
    join public.shop_variant v on v.product_id = i.product_id and v.active
    where i.variant_id is null
  ) then
    raise exception 'Choose an option for every item' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as i(product_id uuid, variant_id uuid, quantity int)
    where i.variant_id is not null and not exists (
      select 1 from public.shop_variant v where v.id = i.variant_id and v.product_id = i.product_id and v.active
    )
  ) then
    raise exception 'Some options in your cart are no longer available' using errcode = 'P0001';
  end if;

  for v_org in
    select distinct p.org_id from public.product p
    where p.id in (select i.product_id from jsonb_to_recordset(p_items) as i(product_id uuid, variant_id uuid, quantity int))
    order by p.org_id
  loop
    insert into public.shop_order (org_id, number, status, payment_method, payment_status, customer_name, phone, address, note,
      subtotal, delivery_fee, total)
    values (v_org, nextval('public.shop_order_number_seq'), 'new', coalesce(p_details ->> 'payment_method', 'cash'), 'unpaid',
      btrim(p_details ->> 'customer_name'), btrim(p_details ->> 'phone'), btrim(p_details ->> 'address'), nullif(btrim(p_details ->> 'note'), ''),
      0, 0, 0)
    returning id into v_order;

    v_sub := 0;
    for v_line in
      select p.id, v.id as variant_id, p.name as title, v.name as variant_name,
        coalesce(v.price, p.price) as price, sum(i.quantity)::int as qty
      from jsonb_to_recordset(p_items) as i(product_id uuid, variant_id uuid, quantity int)
      join public.product p on p.id = i.product_id
      left join public.shop_variant v on v.id = i.variant_id
      where p.org_id = v_org
      group by p.id, v.id, p.name, v.name, v.price, p.price
    loop
      if v_line.variant_id is not null then
        update public.shop_variant set stock = stock - v_line.qty where id = v_line.variant_id and stock >= v_line.qty;
      else
        update public.product set stock = stock - v_line.qty where id = v_line.id and stock >= v_line.qty;
      end if;
      if not found then
        raise exception '% is out of stock', v_line.title using errcode = 'P0001';
      end if;
      insert into public.shop_order_item (org_id, order_id, product_id, variant_id, title, variant_name, unit_price, quantity, line_total)
      values (v_org, v_order, v_line.id, v_line.variant_id, v_line.title, v_line.variant_name, v_line.price, v_line.qty, v_line.price * v_line.qty);
      v_sub := v_sub + v_line.price * v_line.qty;
    end loop;

    v_fee := case when v_sub >= 200000 then 0 else 15000 end;
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
  update public.product pr set stock = pr.stock + i.quantity
  from public.shop_order_item i
  where i.order_id = new.id and i.product_id = pr.id and i.variant_id is null;
  update public.shop_variant v set stock = v.stock + i.quantity
  from public.shop_order_item i
  where i.order_id = new.id and i.variant_id = v.id;
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
    alter publication supabase_realtime add table public.product;
    alter publication supabase_realtime add table public.review;
    alter publication supabase_realtime add table public.question;
    alter publication supabase_realtime add table public.shop_order;
  end if;
end $$;

create or replace function public.dashboard_stats(p_org uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'c0', (select count(*) from public.shop_order where org_id = p_org and status = 'new'),
    'c1', (select coalesce(sum(total), 0) from public.shop_order where org_id = p_org and payment_status = 'paid'),
    'c2', (select count(*) from public.product where org_id = p_org),
    'c3', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select status::text as k, count(*) as n from public.shop_order where org_id = p_org and status is not null group by 1) s)
  )
$$;
grant execute on function public.dashboard_stats(uuid) to authenticated;
