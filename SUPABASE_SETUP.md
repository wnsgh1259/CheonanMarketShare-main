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
```

Then create `.env` in project root:

```bash
VITE_NAVER_MAP_CLIENT_ID=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Restart dev server after updating `.env`.
