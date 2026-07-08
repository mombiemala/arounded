-- 0009: Decision Alerts — civic_events (public hearings, board votes, and public
-- comment deadlines) with proximity alerts that reuse the notifications +
-- Resend pipeline. Community submissions are visible and alert immediately with
-- an "unconfirmed" badge; an admin can later confirm or reject them.
--
-- Alert milestones: 'new' (fires on insert via trigger), 'lead' and 'deadline'
-- (fired by the daily /api/civic-events/scan cron), and 'changed' (status/date
-- change). Each (event, place, milestone) fires at most once via event_alert_log.
--
-- Sample seed rows (source='sample') populate the UI without ever emailing
-- anyone — the trigger skips alerts for the 'sample' source. Applied to prod.

-- ---------------------------------------------------------------------------
-- Jurisdictions (lightweight; enables agenda ingestion + correct local tz)
-- ---------------------------------------------------------------------------
create table if not exists public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text,
  level text,                          -- 'county' | 'city' | 'town' | 'state'
  timezone text,                       -- IANA, for correct local display
  portal_type text,                    -- 'legistar' | 'primegov' | 'civicclerk' | null
  portal_base_url text,
  portal_id text,
  centroid_lat float8,
  centroid_lng float8,
  created_at timestamptz not null default now(),
  unique (name, state)
);

alter table public.jurisdictions enable row level security;
drop policy if exists "public read jurisdictions" on public.jurisdictions;
create policy "public read jurisdictions" on public.jurisdictions
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Civic events — the decision layer
-- ---------------------------------------------------------------------------
create table if not exists public.civic_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'hearing',   -- hearing|vote|comment_deadline|meeting
  status text not null default 'scheduled',      -- scheduled|postponed|cancelled|decided|rejected
  confirmed boolean not null default false,      -- trust badge; admin sets true
  starts_at timestamptz,
  comment_deadline timestamptz,
  outcome text,                                  -- when decided: approved|denied|deferred
  lat float8 not null,
  lng float8 not null,
  jurisdiction_id uuid references public.jurisdictions(id) on delete set null,
  data_center_id uuid references public.data_centers(id) on delete set null,
  description text,
  how_to_comment_url text,
  source text not null default 'community',      -- community|admin|sample|legistar|...
  source_url text,
  source_id text,
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists civic_events_geo_idx on public.civic_events (lat, lng);
create index if not exists civic_events_time_idx on public.civic_events (starts_at);
create index if not exists civic_events_dc_idx on public.civic_events (data_center_id);

alter table public.civic_events enable row level security;

-- Public sees everything except rejected/cancelled (cancelled surfaces only via alert).
drop policy if exists "public read civic_events" on public.civic_events;
create policy "public read civic_events" on public.civic_events
  for select to anon, authenticated
  using (status not in ('rejected', 'cancelled'));

-- Signed-in users may submit; forced unconfirmed, community source, self-attributed.
-- Rate-limiting and data-center proximity are enforced in /api/civic-events/submit.
drop policy if exists "users submit civic_events" on public.civic_events;
create policy "users submit civic_events" on public.civic_events
  for insert to authenticated
  with check (submitted_by = auth.uid() and confirmed = false and source = 'community');

-- ---------------------------------------------------------------------------
-- Alert dedupe log (written only by SECURITY DEFINER fn; no user policies)
-- ---------------------------------------------------------------------------
create table if not exists public.event_alert_log (
  event_id uuid not null references public.civic_events(id) on delete cascade,
  place_id uuid not null references public.saved_places(id) on delete cascade,
  milestone text not null,
  created_at timestamptz not null default now(),
  primary key (event_id, place_id, milestone)
);
alter table public.event_alert_log enable row level security;

-- ---------------------------------------------------------------------------
-- Preferences
-- ---------------------------------------------------------------------------
alter table public.user_settings
  add column if not exists hearing_alerts boolean not null default true,
  add column if not exists alert_lead_days int not null default 7,
  add column if not exists is_admin boolean not null default false;

alter table public.saved_places
  add column if not exists alert_lead_days int;

-- ---------------------------------------------------------------------------
-- Emit alerts to every saved place within radius, once per (event, place,
-- milestone). SECURITY DEFINER so it can write notifications across users.
-- LEFT JOIN user_settings so users with no settings row still default to on.
-- ---------------------------------------------------------------------------
create or replace function public.emit_event_alerts(
  p_event_id uuid, p_lat float8, p_lng float8, p_type text,
  p_title text, p_body text, p_milestone text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  with matched as (
    insert into public.notifications (user_id, place_id, type, title, body, link, data)
    select sp.user_id, sp.id, p_type,
           p_title || ' ' || sp.label,
           p_body,
           '/map?lat=' || sp.lat || '&lng=' || sp.lng,
           jsonb_build_object('civic_event_id', p_event_id)
    from public.saved_places sp
    left join public.user_settings us on us.user_id = sp.user_id
    where sp.user_id is not null
      and coalesce(us.hearing_alerts, true) = true
      and abs(sp.lat - p_lat) <= (coalesce(sp.radius_miles, 10)::float8 / 69.0)
      and abs(sp.lng - p_lng) <= (coalesce(sp.radius_miles, 10)::float8 / (69.0 * greatest(cos(radians(sp.lat)), 0.01)))
      and not exists (
        select 1 from public.event_alert_log l
        where l.event_id = p_event_id and l.place_id = sp.id and l.milestone = p_milestone
      )
    returning place_id
  )
  insert into public.event_alert_log (event_id, place_id, milestone)
  select p_event_id, place_id, p_milestone from matched;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: log civic-event changes and raise "new"/"changed" alerts.
-- Skips the 'sample' source so seed rows never email anyone.
-- ---------------------------------------------------------------------------
create or replace function public.log_civic_event_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_when text;
begin
  if tg_op = 'INSERT' then
    if new.status not in ('rejected', 'cancelled') and new.source <> 'sample' then
      v_when := case when new.starts_at is not null
                     then ' — ' || to_char(new.starts_at, 'Mon FMDD') else '' end;
      perform emit_event_alerts(
        new.id, new.lat, new.lng, 'hearing_scheduled',
        'Local decision coming up near',
        coalesce(new.title, 'A local hearing') || v_when
          || case when new.confirmed then '' else ' (unconfirmed)' end,
        'new'
      );
    end if;
    if new.source <> 'sample' then
      insert into public.changes (dataset, change_type, item_id, change_date, summary, details)
      values ('civic_events', 'added', new.id, current_date,
              'New local decision: ' || coalesce(new.title, 'hearing'),
              jsonb_build_object('event_type', new.event_type, 'confirmed', new.confirmed));
    end if;
    return new;

  elsif tg_op = 'UPDATE' then
    if (new.status is distinct from old.status)
       or (new.starts_at is distinct from old.starts_at)
       or (new.comment_deadline is distinct from old.comment_deadline) then
      if new.source <> 'sample' then
        if new.status = 'cancelled' then
          perform emit_event_alerts(new.id, new.lat, new.lng, 'hearing_changed',
            'A local hearing was cancelled near',
            coalesce(new.title, 'A hearing') || ' has been cancelled.',
            'changed:cancelled');
        elsif new.status not in ('rejected') then
          perform emit_event_alerts(new.id, new.lat, new.lng, 'hearing_changed',
            'A local hearing changed near',
            coalesce(new.title, 'A hearing') || ' was updated — check the new date.',
            'changed:' || new.status);
        end if;
        insert into public.changes (dataset, change_type, item_id, change_date, summary, details)
        values ('civic_events', 'updated', new.id, current_date,
                'Updated: ' || coalesce(new.title, 'hearing'),
                jsonb_build_object('status', new.status));
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists civic_events_change_log on public.civic_events;
create trigger civic_events_change_log
  after insert or update on public.civic_events
  for each row execute function public.log_civic_event_change();

-- ---------------------------------------------------------------------------
-- Time-based reminders, run daily by /api/civic-events/scan (rpc).
--   'lead'     — target (comment deadline, else hearing date) enters the user's
--                lead window (per-place override → user setting → 7 days).
--   'deadline' — comment window closes within 2 days.
-- Each (event, place, milestone) fires once via event_alert_log.
-- ---------------------------------------------------------------------------
create or replace function public.run_decision_scan()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_total int := 0; v_n int;
begin
  with due as (
    select e.id as event_id, e.title, e.lat, e.lng,
           coalesce(e.comment_deadline, e.starts_at) as target,
           sp.id as place_id, sp.user_id, sp.label, sp.lat as splat, sp.lng as splng
    from public.civic_events e
    join public.saved_places sp
      on sp.user_id is not null
     and abs(sp.lat - e.lat) <= (coalesce(sp.radius_miles,10)::float8/69.0)
     and abs(sp.lng - e.lng) <= (coalesce(sp.radius_miles,10)::float8/(69.0*greatest(cos(radians(sp.lat)),0.01)))
    left join public.user_settings us on us.user_id = sp.user_id
    where e.status not in ('rejected','cancelled') and e.source <> 'sample'
      and coalesce(us.hearing_alerts, true) = true
      and coalesce(e.comment_deadline, e.starts_at) is not null
      and coalesce(e.comment_deadline, e.starts_at) > now()
      and now() >= coalesce(e.comment_deadline, e.starts_at)
                   - make_interval(days => coalesce(sp.alert_lead_days, us.alert_lead_days, 7))
      and not exists (select 1 from public.event_alert_log l
                      where l.event_id = e.id and l.place_id = sp.id and l.milestone = 'lead')
  ),
  ins as (
    insert into public.notifications (user_id, place_id, type, title, body, link, data)
    select user_id, place_id, 'hearing_reminder',
           'Decision coming up near ' || label,
           title || ' — ' || to_char(target, 'Mon FMDD'),
           '/map?lat=' || splat || '&lng=' || splng,
           jsonb_build_object('civic_event_id', event_id)
    from due returning 1
  ),
  logged as (
    insert into public.event_alert_log (event_id, place_id, milestone)
    select event_id, place_id, 'lead' from due returning 1
  )
  select count(*) into v_n from logged;
  v_total := v_total + coalesce(v_n, 0);

  with due as (
    select e.id as event_id, e.title, e.lat, e.lng, e.comment_deadline as target,
           sp.id as place_id, sp.user_id, sp.label, sp.lat as splat, sp.lng as splng
    from public.civic_events e
    join public.saved_places sp
      on sp.user_id is not null
     and abs(sp.lat - e.lat) <= (coalesce(sp.radius_miles,10)::float8/69.0)
     and abs(sp.lng - e.lng) <= (coalesce(sp.radius_miles,10)::float8/(69.0*greatest(cos(radians(sp.lat)),0.01)))
    left join public.user_settings us on us.user_id = sp.user_id
    where e.status not in ('rejected','cancelled') and e.source <> 'sample'
      and coalesce(us.hearing_alerts, true) = true
      and e.comment_deadline is not null
      and e.comment_deadline > now()
      and now() >= e.comment_deadline - interval '2 days'
      and not exists (select 1 from public.event_alert_log l
                      where l.event_id = e.id and l.place_id = sp.id and l.milestone = 'deadline')
  ),
  ins as (
    insert into public.notifications (user_id, place_id, type, title, body, link, data)
    select user_id, place_id, 'comment_deadline',
           'Comment closes soon near ' || label,
           'Public comment on ' || title || ' closes ' || to_char(target, 'Mon FMDD'),
           '/map?lat=' || splat || '&lng=' || splng,
           jsonb_build_object('civic_event_id', event_id)
    from due returning 1
  ),
  logged as (
    insert into public.event_alert_log (event_id, place_id, milestone)
    select event_id, place_id, 'deadline' from due returning 1
  )
  select count(*) into v_n from logged;
  v_total := v_total + coalesce(v_n, 0);

  return v_total;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed pilot jurisdictions (VA data-center alley + a GA and TX hotspot).
-- Real jurisdictions + timezones; real events arrive via admin/community/ingest.
-- ---------------------------------------------------------------------------
insert into public.jurisdictions (name, state, level, timezone, centroid_lat, centroid_lng) values
  ('Prince William County', 'VA', 'county', 'America/New_York', 38.7509, -77.4753),
  ('Loudoun County',        'VA', 'county', 'America/New_York', 39.0908, -77.6456),
  ('Fayette County',        'GA', 'county', 'America/New_York', 33.4132, -84.4844),
  ('Navarro County',        'TX', 'county', 'America/Chicago',  32.0851, -96.4686)
on conflict (name, state) do nothing;

-- A couple of clearly-labeled sample events so the UI renders on day one.
-- source='sample' → the trigger never emails anyone about these.
insert into public.civic_events
  (title, event_type, status, confirmed, starts_at, comment_deadline, lat, lng,
   jurisdiction_id, data_center_id, description, how_to_comment_url, source, source_id)
select
  'Sample: rezoning hearing for a proposed data center',
  'hearing', 'scheduled', false,
  now() + interval '18 days', now() + interval '11 days',
  38.72, -77.52,
  (select id from public.jurisdictions where name = 'Prince William County' and state = 'VA'),
  (select id from public.data_centers where status = 'proposed'
     order by abs(lat - 38.72) + abs(lng + 77.52) limit 1),
  'Example event to demonstrate the Decision Alerts UI. Replace with real agenda data.',
  'https://www.pwcva.gov/department/planning-office',
  'sample', 'sample-pwc-1'
on conflict (source, source_id) do nothing;

insert into public.civic_events
  (title, event_type, status, confirmed, starts_at, comment_deadline, lat, lng,
   jurisdiction_id, source, source_id, description)
select
  'Sample: county board vote on a data-center special-use permit',
  'vote', 'scheduled', false,
  now() + interval '25 days', now() + interval '20 days',
  33.41, -84.49,
  (select id from public.jurisdictions where name = 'Fayette County' and state = 'GA'),
  'sample', 'sample-fayette-1',
  'Example event to demonstrate the Decision Alerts UI. Replace with real agenda data.'
on conflict (source, source_id) do nothing;
