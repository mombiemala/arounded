-- Per-user multiple saved places (Home, Work, School, ...). Applied to prod.
-- Previously saved_places had no user_id, no name column, and no label unique
-- constraint, and RLS only allowed anon read with no insert policy — so
-- client-side saving never actually worked.

alter table public.saved_places
  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.saved_places
  add column if not exists name text;

-- One entry per label per user; users are independent of each other.
alter table public.saved_places
  drop constraint if exists saved_places_user_label_key;
alter table public.saved_places
  add constraint saved_places_user_label_key unique (user_id, label);

-- Replace permissive anon read with per-user access (select/insert/update/delete).
drop policy if exists "public read saved_places" on public.saved_places;
drop policy if exists "users manage own places" on public.saved_places;
create policy "users manage own places"
  on public.saved_places for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- History is readable only for the signed-in user's own places.
drop policy if exists "public read daily_conditions" on public.daily_conditions;
drop policy if exists "users read own conditions" on public.daily_conditions;
create policy "users read own conditions"
  on public.daily_conditions for select
  to authenticated
  using (exists (
    select 1 from public.saved_places p
    where p.id = daily_conditions.place_id and p.user_id = auth.uid()
  ));
