# Supabase Shared Data Setup

Run this SQL in Supabase SQL Editor:

```sql
create table if not exists public.owner_dashboard_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.owner_dashboard_state enable row level security;

drop policy if exists "public read owner state" on public.owner_dashboard_state;
create policy "public read owner state"
on public.owner_dashboard_state
for select
to anon, authenticated
using (true);

drop policy if exists "public upsert owner state" on public.owner_dashboard_state;
create policy "public upsert owner state"
on public.owner_dashboard_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "public update owner state" on public.owner_dashboard_state;
create policy "public update owner state"
on public.owner_dashboard_state
for update
to anon, authenticated
using (true)
with check (true);

-- 상점별 로그인 계정 (1-1)
create table if not exists public.store_accounts (
  store_id bigint primary key,
  store_name text not null,
  phone text not null unique,
  pin text not null,
  updated_at timestamptz not null default now()
);

alter table public.store_accounts enable row level security;

drop policy if exists "public read store accounts" on public.store_accounts;
create policy "public read store accounts"
on public.store_accounts
for select
to anon, authenticated
using (true);

drop policy if exists "public upsert store accounts" on public.store_accounts;
create policy "public upsert store accounts"
on public.store_accounts
for insert
to anon, authenticated
with check (true);

drop policy if exists "public update store accounts" on public.store_accounts;
create policy "public update store accounts"
on public.store_accounts
for update
to anon, authenticated
using (true)
with check (true);

-- 사장님 가입 신청 (1-2)
create table if not exists public.owner_signup_applications (
  id bigint primary key,
  store_name text not null,
  email text not null,
  phone text not null unique,
  pin text not null,
  address text not null default '',
  store_image text not null default '',
  market_id text not null default 'jungang',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reject_reason text,
  approved_store_id bigint,
  updated_at timestamptz not null default now()
);

alter table public.owner_signup_applications enable row level security;

drop policy if exists "public read owner signup applications" on public.owner_signup_applications;
create policy "public read owner signup applications"
on public.owner_signup_applications
for select
to anon, authenticated
using (true);

drop policy if exists "public upsert owner signup applications" on public.owner_signup_applications;
create policy "public upsert owner signup applications"
on public.owner_signup_applications
for insert
to anon, authenticated
with check (true);

drop policy if exists "public update owner signup applications" on public.owner_signup_applications;
create policy "public update owner signup applications"
on public.owner_signup_applications
for update
to anon, authenticated
using (true)
with check (true);

-- 상점/손님 설정 변경 신청
create table if not exists public.owner_change_requests (
  id bigint primary key,
  store_id bigint,
  type text not null,
  store_name text not null,
  current_value text not null,
  new_value text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reject_reason text,
  source text not null default 'store',
  updated_at timestamptz not null default now()
);

alter table public.owner_change_requests enable row level security;

drop policy if exists "public read owner change requests" on public.owner_change_requests;
create policy "public read owner change requests"
on public.owner_change_requests
for select
to anon, authenticated
using (true);

drop policy if exists "public upsert owner change requests" on public.owner_change_requests;
create policy "public upsert owner change requests"
on public.owner_change_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "public update owner change requests" on public.owner_change_requests;
create policy "public update owner change requests"
on public.owner_change_requests
for update
to anon, authenticated
using (true)
with check (true);
```

Then create `.env` in project root:

```bash
VITE_NAVER_MAP_CLIENT_ID=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Restart dev server after updating `.env`.
