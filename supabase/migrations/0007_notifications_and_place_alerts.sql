-- Per-user in-app notifications, plus place alerts driven by the data-center
-- change trigger: when a data center appears or changes status within a saved
-- place's radius, the owner gets a notification. Applied to prod.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  place_id uuid references public.saved_places(id) on delete set null,
  type text not null,
  title text not null,
  body text,
  link text,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "users update own notifications" on public.notifications;
create policy "users update own notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- Notify every saved place within its radius of a point. SECURITY DEFINER so the
-- change trigger can insert across users' rows (no user INSERT policy exists).
create or replace function public.notify_nearby_places(
  p_dc_id uuid, p_lat float8, p_lng float8, p_type text, p_title_prefix text, p_body text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, place_id, type, title, body, link, data)
  select sp.user_id, sp.id, p_type,
         p_title_prefix || ' ' || sp.label,
         p_body,
         '/map?lat=' || sp.lat || '&lng=' || sp.lng,
         jsonb_build_object('data_center_id', p_dc_id)
  from public.saved_places sp
  where sp.user_id is not null
    and abs(sp.lat - p_lat) <= (coalesce(sp.radius_miles, 10)::float8 / 69.0)
    and abs(sp.lng - p_lng) <= (coalesce(sp.radius_miles, 10)::float8 / (69.0 * greatest(cos(radians(sp.lat)), 0.01)));
end;
$$;

create or replace function public.dc_status_label(s text)
returns text language sql immutable as $$
  select case s
    when 'operational' then 'Operating'
    when 'proposed' then 'Proposed'
    when 'construction' then 'Under construction'
    when 'expanding' then 'Expanding'
    when 'cancelled' then 'Cancelled'
    else coalesce(s, 'Unknown') end;
$$;

-- Change tracking now also logs status transitions and raises place alerts.
create or replace function public.log_data_center_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.changes (dataset, change_type, item_id, change_date, summary, details)
    values ('data_centers', 'added', new.id, current_date,
            'Added ' || coalesce(new.name, 'data center') || ' (' || dc_status_label(new.status) || ')',
            jsonb_build_object('source', new.source, 'status', new.status));
    perform notify_nearby_places(new.id, new.lat, new.lng, 'data_center_added',
            'New data center near',
            coalesce(new.name, 'A data center') || ' — ' || dc_status_label(new.status));
    return new;

  elsif (tg_op = 'UPDATE') then
    if (new.status is distinct from old.status) then
      insert into public.changes (dataset, change_type, item_id, change_date, summary, details)
      values ('data_centers', 'updated', new.id, current_date,
              coalesce(new.name, 'A data center') || ' is now ' || dc_status_label(new.status),
              jsonb_build_object('from', old.status, 'to', new.status));
      perform notify_nearby_places(new.id, new.lat, new.lng, 'data_center_status',
              'Data center update near',
              coalesce(new.name, 'A data center') || ' is now ' || dc_status_label(new.status));
    elsif (new.name is distinct from old.name)
          or (new.lat is distinct from old.lat)
          or (new.lng is distinct from old.lng) then
      insert into public.changes (dataset, change_type, item_id, change_date, summary, details)
      values ('data_centers', 'updated', new.id, current_date,
              'Updated ' || coalesce(new.name, 'data center'),
              jsonb_build_object('source', new.source));
    end if;
    return new;

  elsif (tg_op = 'DELETE') then
    insert into public.changes (dataset, change_type, item_id, change_date, summary, details)
    values ('data_centers', 'removed', old.id, current_date,
            'Removed ' || coalesce(old.name, 'data center'),
            jsonb_build_object('source', old.source));
    return old;
  end if;
  return null;
end;
$$;
