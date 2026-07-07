# Build spec — Decision Alerts (proximity hearing & comment-deadline alerts)

> **Status:** Draft for review · **Owner:** —  · **Target:** Phased (P0 ships the full loop on human-curated data)
> **Source:** Market research recommendation #1 — *"Own the 'found out too late' problem."*

## 1. The problem this solves

The single most-cited resident complaint about nearby development is **transparency and
timing**: "By the time most neighbors know a data center is planned, the land-use approvals
are already in place." A Virginia court voided the Prince William "Digital Gateway" hub in
2026 specifically because the county **failed to give homeowners timely notice** of a key
rezoning vote.

Today arounded tells a user *that a data center exists or changed status* near a saved place
(`data_centers` change trigger → `notify_nearby_places()`). It does **not** tell them **when
they can do something about it** — the public hearing, the board vote, or the comment
deadline. No competitor does. This feature closes that gap and is the sharpest wedge we have:
it converts a passive map into a reason to hold an account and act.

**Job to be done:** *"Tell me, in time to act, when there's a public decision point about
something being built near a place I care about — and how to weigh in."*

### Success criteria (north star + supporting)
- **North star:** % of alerted users who are notified **before** the comment window closes
  (target: ≥ 90% get ≥ the user's lead-time days of warning).
- Supporting: share of saved places with ≥ 1 upcoming decision surfaced; alert → map
  click-through; "how to comment" link click-through; events added per week (community +
  ingested); postpone/cancel accuracy.

## 2. Scope

**In (v1 / P0):**
- A `civic_events` layer: hearings, votes, and comment deadlines, each geolocated and
  optionally linked to a `data_centers` row.
- Alerts at defined milestones (new event nearby, T-minus lead-time, comment-close) reusing
  the existing notifications + Resend digest pipeline.
- Human-curated data first: admin/manual seeding + moderated community submissions.
- Map + saved-place UI: a "Next decision" line on proposed/under-construction data centers
  and an upcoming-decisions timeline.
- Per-user opt-out and lead-time preference.

**Out (later phases):** automated agenda ingestion (P1), state PUC/utility dockets (P2), SMS,
calendar-account sync, non-data-center project types (rezonings generally). The schema is
designed so these extend it without a rewrite.

## 3. The hard part: where hearing data comes from

There is **no national feed** of local land-use hearings. Sourcing is the real work, so we
phase it and ship the alert loop on curated data first (this is exactly the model
floridadatacenters.org proved — 1,100+ resident reports, 1M+ visits).

| Phase | Source | Coverage | Effort |
|---|---|---|---|
| **P0** | Manual/admin seeding + **moderated community submissions** | Hotspot counties we pick | Low — build the loop |
| **P1** | **Civic-agenda platform APIs**: Legistar (Granicus) InSite API, CivicClerk, PrimeGov, CivicPlus — keyword-match agendas for "data center / rezoning / special-use permit" | Large share of US municipalities on these platforms | Medium — one adapter per platform |
| **P2** | State PUC / utility-commission dockets; FracTracker opposition linkage; LLM extraction from agenda PDFs | Statewide siting fights | High |

**P0 pilot geography:** seed 2–3 active hotspots (e.g., Prince William County VA, and
one each in GA and TX) so the loop has real data on day one. Decision needed — see §11.

## 4. Data model

New tables + minimal extensions. Follows existing conventions: `public` schema, RLS on,
public read only where safe, cross-user writes via `SECURITY DEFINER` functions.

### 4.1 `jurisdictions` (lightweight — enables ingestion + tz)
```sql
create table if not exists public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  name text not null,                     -- "Prince William County"
  state text,                             -- "VA"
  level text,                             -- 'county' | 'city' | 'town' | 'state'
  timezone text,                          -- IANA, for correct local display
  portal_type text,                       -- 'legistar' | 'primegov' | 'civicclerk' | null
  portal_base_url text,                   -- agenda portal / API root
  portal_id text,                         -- client id/slug on that platform
  centroid_lat float8,
  centroid_lng float8,
  created_at timestamptz not null default now(),
  unique (name, state)
);
```

### 4.2 `civic_events` (the core layer)
```sql
create table if not exists public.civic_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,                    -- "Rezoning vote — Sentinel data center"
  event_type text not null,               -- 'hearing' | 'vote' | 'comment_deadline' | 'meeting'
  status text not null default 'scheduled', -- 'scheduled'|'postponed'|'cancelled'|'decided'
  starts_at timestamptz,                   -- when the hearing/vote happens (null for pure deadlines)
  comment_deadline timestamptz,            -- when public comment closes (nullable)
  outcome text,                            -- filled when status='decided': 'approved'|'denied'|'deferred'
  -- geography: always present so saved-place radius matching works
  lat float8 not null,
  lng float8 not null,
  jurisdiction_id uuid references public.jurisdictions(id) on delete set null,
  data_center_id uuid references public.data_centers(id) on delete set null,
  -- provenance
  description text,
  how_to_comment_url text,                 -- portal/agenda link to submit comment
  source text not null,                    -- 'community' | 'legistar' | 'admin' | ...
  source_url text,
  source_id text,                          -- stable id on the source (for dedupe/upsert)
  verified boolean not null default false, -- community submissions start false
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source, source_id)
);

create index if not exists civic_events_geo_idx on public.civic_events (lat, lng);
create index if not exists civic_events_time_idx on public.civic_events (starts_at);
create index if not exists civic_events_dc_idx on public.civic_events (data_center_id);

alter table public.civic_events enable row level security;

-- Public reads only verified, non-cancelled, future-ish events.
drop policy if exists "public read verified events" on public.civic_events;
create policy "public read verified events"
  on public.civic_events for select to anon, authenticated
  using (verified = true);

-- Signed-in users may submit; forced unverified + attributed to them.
drop policy if exists "users submit events" on public.civic_events;
create policy "users submit events"
  on public.civic_events for insert to authenticated
  with check (verified = false and submitted_by = auth.uid());
-- Moderation/updates run via service role (server), not client policies.
```

### 4.3 Alert dedupe log (prevents cron re-spam)
```sql
create table if not exists public.event_alert_log (
  event_id uuid not null references public.civic_events(id) on delete cascade,
  place_id uuid not null references public.saved_places(id) on delete cascade,
  milestone text not null,                 -- 'new' | 'lead' | 'deadline' | 'changed'
  created_at timestamptz not null default now(),
  primary key (event_id, place_id, milestone)
);
alter table public.event_alert_log enable row level security; -- no policies: SECURITY DEFINER only
```

### 4.4 Extensions to existing tables
```sql
-- Per-user preferences: separate opt-out + configurable lead time.
alter table public.user_settings
  add column if not exists hearing_alerts boolean not null default true,
  add column if not exists alert_lead_days int not null default 7;

-- Optional per-place override (nullable → falls back to user setting).
alter table public.saved_places
  add column if not exists alert_lead_days int;
```
`notifications.type` is free text — new values `hearing_scheduled`, `hearing_reminder`,
`comment_deadline`, `hearing_changed` need **no** schema change. The Resend digest already
picks up any unsent notification, so email works with zero changes to the send path (we only
enhance the template, §7).

## 5. Alert emission logic

Two mechanisms, mirroring the existing split (trigger for change-events, cron for time-based):

### 5.1 Trigger — "new decision nearby" (immediate)
On `INSERT` of a **verified** civic_event (or on `UPDATE` flipping `verified false→true` at
moderation time), fire once per matched saved place. Reuse the proven geo-match from
`notify_nearby_places()`; factor the bounding-box predicate into a shared helper.

```sql
create or replace function public.emit_event_alerts(
  p_event_id uuid, p_lat float8, p_lng float8, p_type text, p_title text,
  p_body text, p_milestone text
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, place_id, type, title, body, link, data)
  select sp.user_id, sp.id, p_type, p_title || ' ' || sp.label, p_body,
         '/map?lat=' || sp.lat || '&lng=' || sp.lng,
         jsonb_build_object('civic_event_id', p_event_id)
  from public.saved_places sp
  join public.user_settings us on us.user_id = sp.user_id
  where coalesce(us.hearing_alerts, true) = true
    and abs(sp.lat - p_lat) <= (coalesce(sp.radius_miles,10)::float8 / 69.0)
    and abs(sp.lng - p_lng) <= (coalesce(sp.radius_miles,10)::float8 / (69.0 * greatest(cos(radians(sp.lat)),0.01)))
    and not exists (
      select 1 from public.event_alert_log l
      where l.event_id = p_event_id and l.place_id = sp.id and l.milestone = p_milestone
    );
  insert into public.event_alert_log (event_id, place_id, milestone)
  select sp.id_placeholder ... ; -- see note
end; $$;
```
> Implementation note: insert the dedupe rows for exactly the saved places that matched (use a
> CTE returning `sp.id` and insert into both `notifications` and `event_alert_log` from it), so
> the `not exists` guard makes each milestone fire at most once per (event, place).

### 5.2 Cron — time-based reminders (`lead`, `deadline`)
New daily cron `GET /api/civic-events/scan`:
- For each verified, non-cancelled event with a future `starts_at`/`comment_deadline`:
  - **lead** milestone: when `now >= (target - lead_days)` for a matched place, where
    `lead_days = coalesce(place.alert_lead_days, user.alert_lead_days, 7)` and
    `target = coalesce(comment_deadline, starts_at)`.
  - **deadline** milestone: when a `comment_deadline` exists and `now >= deadline - 2 days`.
- Also detect `status`/`starts_at` changes → **changed** milestone ("Hearing moved to …" /
  "…was cancelled"). Compare against stored values; emit via `emit_event_alerts`.
- Dedupe via `event_alert_log`. Batch-friendly; `maxDuration = 60` like the other crons.

`vercel.json` additions:
```json
{ "path": "/api/civic-events/scan",   "schedule": "45 10 * * *" },
{ "path": "/api/civic-events/ingest", "schedule": "0 8 * * 1" }   // P1
```

## 6. API routes (Next.js App Router, service-role where noted)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/civic-events/nearby?lat&lng&radius` | GET | public | Verified events near a point (map/popup). Mirrors `facilities/nearby`. |
| `/api/civic-events/upcoming?place_id` | GET | user | Upcoming decisions for a saved place (timeline). |
| `/api/civic-events/submit` | POST | user | Community submission → `verified=false, submitted_by=uid`. Rate-limited. |
| `/api/civic-events/moderate` | POST | admin | Approve/reject/edit (service role + admin check). Approve flips `verified=true` → trigger fires "new". |
| `/api/civic-events/scan` | GET | cron | Emit time-based reminders (§5.2). |
| `/api/civic-events/ingest` | GET | cron | **P1** — pull agenda portals, keyword-match, upsert on `(source, source_id)`. |
| `/api/civic-events/[id]/ics` | GET | public | Calendar file (`.ics`) for a hearing/deadline. |

Admin check: add `user_settings.is_admin boolean default false` (or a small `admins` table);
`moderate` requires it. Ingestion + scan run with `SUPABASE_SERVICE_ROLE_KEY` like the
existing update routes and disable the trigger during bulk upserts, then rely on the scan/
moderation path to emit alerts (avoids alert storms on backfill — same pattern as the
FracTracker bulk load).

## 7. Notifications & email

- New notification `type`s render through the **existing** digest unchanged; enhance
  `digestHtml()` to special-case event types: show the **date, comment deadline, jurisdiction,
  an "Add to calendar" (.ics) link, and a "How to comment" button** (`how_to_comment_url`).
- Respect a **separate** opt-out: `hearing_alerts` (distinct from `email_alerts`). The email
  cron should skip emailing hearing notifications to users with `hearing_alerts=false`
  (in-app still recorded, or suppressed — decision in §11). Reuse the HMAC unsubscribe token;
  add `&kind=hearing` so unsubscribe can target this stream specifically.
- Subject line when a deadline is imminent: *"Comment closes Fri on a data center near
  {label}"* — urgency drives open rate.

## 8. Frontend / UX

**Map (`MapView.tsx`):**
- Proposed / under-construction data centers **with an upcoming event** get a pulse ring or a
  small "📅 decision soon" badge (reuse the `Decor`/status-dot vocabulary; semantic, not
  decorative — only shows when a real event is within lead window).
- Popup gains a **"Next decision"** block: `Rezoning vote · Aug 12 · comment closes Aug 5`,
  with *Add to calendar* and *How to comment* actions.

**Saved-place / new panel — "Upcoming decisions":**
- A timeline sorted by soonest `target` across the user's saved places (and the current map
  view for anon users), each row: title, date, deadline countdown, distance, jurisdiction,
  source badge (**"Community-submitted · unconfirmed"** when `verified` but flagged low-trust,
  or "Official agenda" for ingested). Empty state explains what will appear.

**Community submission:**
- "Know about a hearing near here? Add it" → a short form (title, type, date, deadline,
  location pin defaulting to the nearest DC or map center, source URL). Inserts unverified;
  confirmation explains it's reviewed before others see it.

**Preferences (notifications dropdown / settings):**
- Toggle "Alert me about local hearings & comment deadlines" (`hearing_alerts`).
- Lead time selector: 3 / 7 / 14 days (`alert_lead_days`).

**Lightweight admin moderation** (protected route `/admin/events` or a filtered view): list
unverified + recently-changed events, approve/reject/edit, set `how_to_comment_url`.

## 9. Data quality & edge cases

- **Timezones:** store `timestamptz`; display in the event's local tz (from `jurisdictions.timezone`,
  or derive from lat/lng). Never show a hearing time in the viewer's tz silently.
- **Postpone/cancel:** status change emits a `changed` alert; cancelled events drop off public
  read but keep the alert log so we don't re-alert if reinstated with a new id.
- **Stale events:** `scan` ignores past `target`s; UI hides events whose `target < now` unless
  `status='decided'` (then show outcome briefly on the change log).
- **Dedupe of submissions:** soft-match on `(jurisdiction, data_center_id, date)` and
  `source_url` at submit + moderation; merge rather than duplicate.
- **Trust:** community events carry a visible "unconfirmed" badge until an admin marks
  `verified` *and* a `trust='confirmed'` flag (add if needed); alerts can be gated to confirmed
  only, or sent with the caveat — decision in §11.
- **Alert storms:** `event_alert_log` unique key + per-user batching in the digest + trigger
  disabled during bulk ingest.
- **Radius cost:** bounding-box prefilter (already the pattern) + `civic_events_geo_idx`.
- **Legal framing:** every alert/detail carries "Verify time & how to participate with the
  jurisdiction — details can change." Consistent with the app's non-alarmist, sourced stance.

## 10. Phasing & rough milestones

- **P0 — ship the loop on curated data (~1.5–2 wks):** migrations (§4), `emit_event_alerts` +
  insert/moderation trigger, `scan` cron, digest template update, map "Next decision" +
  timeline, community submit + basic moderation, prefs. Seed pilot counties.
- **P1 — automate ingestion (~2–3 wks):** Legistar/PrimeGov/CivicClerk adapters keyed by
  `jurisdictions.portal_*`, keyword matching, upsert + link to nearest proposed DC, weekly
  `ingest` cron, `.ics` export.
- **P2 — scale & deepen:** state PUC dockets, LLM extraction from agenda PDFs, generalize
  beyond data centers to any rezoning/special-use permit, optional SMS, calendar sync.

## 11. Open decisions (need product input)

1. **Pilot geography** for P0 seeding — which 2–3 counties? (Suggest PWC VA + one GA + one TX.)
2. **Community submissions:** require login (recommended) vs allow anonymous with heavier
   moderation?
3. **Trust gating:** do unconfirmed community events trigger alerts (with a caveat) or only
   after admin confirmation?
4. **Admin model:** who moderates, and is `is_admin` on `user_settings` enough for v1?
5. **hearing_alerts opt-out:** suppress in-app too, or in-app on / email off?
6. **SMS** in scope for the "comment closes tomorrow" moment, or email-only for v1?

## 12. Dependencies & notes

- Requires the **Supabase MCP connector to be re-authorized** before migrations can be applied
  (currently disconnected this session).
- No new third-party runtime deps for P0. P1 adds outbound calls to civic-agenda APIs — run
  server-side (route handlers / SQL `http_get`) consistent with existing ingestion, mindful of
  the sandbox's outbound limits.
- Reuses: `notify_nearby_places` geo math, `notifications`/`user_settings`, Resend digest,
  HMAC unsub token, cron + service-role route patterns, `Decor`/status-dot UI vocabulary.
