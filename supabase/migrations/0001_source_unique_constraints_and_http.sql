-- Applied to production (project qdcqrihiatbdgdxwpizt) on 2026-07-01.
-- Captured here so the schema is reproducible from the repo.

-- HTTP client extension, used for running data ingestion server-side
-- (e.g. one-off seeds via SQL). The application ingestion routes fetch over
-- the network themselves and do NOT depend on this extension, so it can be
-- dropped if you prefer to minimize surface:
--   drop extension if exists http;
create extension if not exists http with schema extensions;

-- Unique keys on (source, source_id) make ingestion idempotent per source and
-- enable incremental first_seen/last_seen tracking. NULL source_id pairs
-- (e.g. manually curated rows) remain distinct under the default NULLS DISTINCT.
alter table public.data_centers
  add constraint data_centers_source_source_id_key unique (source, source_id);

alter table public.epa_facilities
  add constraint epa_facilities_source_source_id_key unique (source, source_id);

-- New rows get first_seen automatically; upserts that omit it preserve history.
alter table public.data_centers
  alter column first_seen set default current_date;
