-- DirectBelgium core. Apply only to a dedicated DirectBelgium Supabase project.
create type public.app_role as enum ('CUSTOMER','SALES_AGENT','INVENTORY_MANAGER','PROCUREMENT_MANAGER','OPERATIONS_MANAGER','FINANCE','SUPER_ADMIN');
create type public.product_category as enum ('CAR','PHONE','LAPTOP');
create type public.product_availability as enum ('AVAILABLE_FOR_INQUIRY','AVAILABILITY_BEING_CONFIRMED','QUOTATION_AVAILABLE','RESERVED_FOR_CUSTOMER','NO_LONGER_AVAILABLE','SOLD','ARCHIVED');
create type public.appointment_status as enum ('REQUESTED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW','RESCHEDULED');
create type public.quote_status as enum ('DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED','SUPERSEDED','CANCELLED');
create type public.payment_status as enum ('INITIATED','AUTHORIZED','SETTLED','FAILED','REVERSED','REFUNDED');
create type public.procurement_status as enum ('READY_FOR_PURCHASE','PURCHASING','PURCHASED','SUPPLIER_UNAVAILABLE','PRICE_CHANGED','PURCHASE_FAILED','CANCELLED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text, phone text, nigeria_delivery_address jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_roles (user_id uuid not null references public.profiles(id) on delete cascade, role public.app_role not null, primary key(user_id, role));
create table public.products (
  id uuid primary key default gen_random_uuid(), slug text unique not null, category public.product_category not null,
  title text not null, public_specs jsonb not null default '{}'::jsonb, condition_notes text,
  origin_country text not null default 'Canada', display_price_minor bigint, display_currency text not null default 'NGN',
  estimated_shipping_minor bigint, availability public.product_availability not null default 'AVAILABLE_FOR_INQUIRY',
  featured boolean not null default false, published boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, storage_path text not null, sort_order int not null default 0, alt_text text);
create table public.inquiries (id uuid primary key default gen_random_uuid(), customer_id uuid references public.profiles(id), product_id uuid references public.products(id), guest_name text, guest_email text, guest_phone text, notes text, created_at timestamptz not null default now());
create table public.appointments (id uuid primary key default gen_random_uuid(), customer_id uuid references public.profiles(id), inquiry_id uuid references public.inquiries(id), product_id uuid references public.products(id), appointment_type text not null check(appointment_type in ('IN_PERSON','PHONE','VIDEO')), starts_at timestamptz not null, ends_at timestamptz not null, status public.appointment_status not null default 'REQUESTED', assigned_staff_id uuid references public.profiles(id), created_at timestamptz not null default now(), check(ends_at > starts_at));
create table public.quotes (id uuid primary key default gen_random_uuid(), quote_number text unique not null, customer_id uuid not null references public.profiles(id), product_id uuid not null references public.products(id), status public.quote_status not null default 'DRAFT', currency text not null default 'NGN', product_price_minor bigint not null check(product_price_minor >= 0), shipping_minor bigint not null check(shipping_minor >= 0), insurance_minor bigint not null default 0 check(insurance_minor >= 0), service_fee_minor bigint not null default 0 check(service_fee_minor >= 0), customs_estimate_minor bigint, customs_notes text, expires_at timestamptz not null, snapshot jsonb not null, terms_version text not null, accepted_at timestamptz, accepted_terms_version text, created_at timestamptz not null default now());
create table public.orders (id uuid primary key default gen_random_uuid(), order_number text unique not null, customer_id uuid not null references public.profiles(id), product_id uuid not null references public.products(id), quote_id uuid unique not null references public.quotes(id), status text not null default 'AWAITING_PAYMENT', created_at timestamptz not null default now());
create table public.payments (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), provider_reference text unique not null, provider text not null, amount_minor bigint not null check(amount_minor > 0), currency text not null, status public.payment_status not null default 'INITIATED', verified_at timestamptz, provider_payload jsonb, created_at timestamptz not null default now());
create table public.procurements (id uuid primary key default gen_random_uuid(), order_id uuid unique not null references public.orders(id), status public.procurement_status not null default 'READY_FOR_PURCHASE', supplier_reference text, acquisition_price_minor bigint, acquisition_currency text, internal_notes text, purchased_at timestamptz, created_at timestamptz not null default now());
create table public.shipments (id uuid primary key default gen_random_uuid(), shipment_reference text unique not null, origin_country text not null default 'Canada', destination_country text not null default 'Nigeria', carrier text, tracking_number text, departure_at timestamptz, estimated_arrival_at timestamptz, actual_arrival_at timestamptz, created_at timestamptz not null default now());
create table public.shipment_orders (shipment_id uuid not null references public.shipments(id) on delete cascade, order_id uuid not null references public.orders(id) on delete cascade, primary key(shipment_id,order_id));
create table public.shipment_events (id uuid primary key default gen_random_uuid(), shipment_id uuid not null references public.shipments(id) on delete cascade, milestone text not null, customer_visible boolean not null default true, occurred_at timestamptz not null, staff_note text, created_at timestamptz not null default now());

alter table public.profiles enable row level security; alter table public.products enable row level security; alter table public.product_images enable row level security; alter table public.inquiries enable row level security; alter table public.appointments enable row level security; alter table public.quotes enable row level security; alter table public.orders enable row level security; alter table public.payments enable row level security; alter table public.shipments enable row level security; alter table public.shipment_orders enable row level security; alter table public.shipment_events enable row level security;
create policy "public reads published products" on public.products for select using (published and availability not in ('ARCHIVED','SOLD'));
create policy "public reads product images for visible products" on public.product_images for select using (exists(select 1 from public.products p where p.id=product_id and p.published));
create policy "customer reads own profile" on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy "customer updates own profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "customer creates own inquiry" on public.inquiries for insert to authenticated with check ((select auth.uid())=customer_id);
create policy "customer reads own inquiries" on public.inquiries for select to authenticated using ((select auth.uid())=customer_id);
create policy "customer reads own appointments" on public.appointments for select to authenticated using ((select auth.uid())=customer_id);
create policy "customer reads own quotes" on public.quotes for select to authenticated using ((select auth.uid())=customer_id);
create policy "customer reads own orders" on public.orders for select to authenticated using ((select auth.uid())=customer_id);
create policy "customer reads payments for own orders" on public.payments for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and o.customer_id=(select auth.uid())));
create policy "customer reads shipment events for own orders" on public.shipment_events for select to authenticated using (customer_visible and exists(select 1 from public.shipment_orders so join public.orders o on o.id=so.order_id where so.shipment_id=shipment_id and o.customer_id=(select auth.uid())));

-- Privileged staff writes must run through server routes using the service role after an explicit role check.
