-- Switch the data-center layer to the FracTracker Alliance U.S. Data Centers
-- Tracker: proposed, under-construction, expanding, and operating sites with
-- status, operator, power demand, cooling, size, and community-opposition data.
-- Supersedes PeeringDB (operating interconnection sites only) to add "what's
-- coming" and impact context, and to avoid duplicate operating-site dots.
--
-- FracTracker data is used under its non-commercial terms with attribution.
-- The ongoing weekly refresh runs from /api/data-centers/update (see vercel.json).
-- Applied to prod. Requires the `http` extension (migration 0001).

-- Bulk data loads disable the change-log trigger to avoid thousands of spurious
-- entries, then log a single summary change.
alter table public.data_centers disable trigger data_centers_change_log;

-- Retire PeeringDB rows (reversible: re-run the PeeringDB ingest if ever wanted).
delete from public.data_centers where source = 'PeeringDB';

-- Ingest the FracTracker tracker (two pages of 1000 cover the full set).
with raw as (
  select content::jsonb as j from extensions.http_get('https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/data_centers_v4_agol_all/FeatureServer/0/query?where=1%3D1&outFields=facility_id,facility_name,city,state,status,operator_name,mw,cooling_type,facility_size_sqft,community_pushback&f=geojson&resultRecordCount=1000&resultOffset=0')
  union all
  select content::jsonb from extensions.http_get('https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/data_centers_v4_agol_all/FeatureServer/0/query?where=1%3D1&outFields=facility_id,facility_name,city,state,status,operator_name,mw,cooling_type,facility_size_sqft,community_pushback&f=geojson&resultRecordCount=1000&resultOffset=1000')
),
feats as ( select jsonb_array_elements(j->'features') as f from raw ),
rows as (
  select f->'properties' as p, f->'geometry'->'coordinates' as c
  from feats where f->'geometry'->'coordinates' is not null
)
insert into public.data_centers (name, lat, lng, status, source, source_id, notes, last_seen)
select
  coalesce(nullif(trim(p->>'facility_name'), ''), 'Data center')
    || case when coalesce(nullif(trim(p->>'city'), ''), '') <> '' or coalesce(nullif(trim(p->>'state'), ''), '') <> ''
            then ' (' || trim(concat_ws(', ', nullif(trim(p->>'city'), ''), nullif(trim(p->>'state'), ''))) || ')'
            else '' end,
  (c->>1)::float8, (c->>0)::float8,
  case p->>'status'
    when 'Operating' then 'operational'
    when 'Proposed' then 'proposed'
    when 'Approved/Permitted/Under construction' then 'construction'
    when 'Expanding' then 'expanding'
    when 'Cancelled' then 'cancelled'
    else 'other' end,
  'FracTracker',
  coalesce(nullif(trim(p->>'facility_id'), ''), 'ft-' || md5(p->>'facility_name')),
  nullif(array_to_string(array[
    nullif(trim(p->>'operator_name'), ''),
    case when trim(p->>'mw') ~ '^[0-9]' then trim(p->>'mw') || ' MW' end,
    nullif(trim(p->>'cooling_type'), ''),
    case when (p->>'facility_size_sqft') is not null and (p->>'facility_size_sqft') <> ''
         then to_char(round((p->>'facility_size_sqft')::numeric), 'FM999,999,999') || ' sq ft' end,
    case when p->>'community_pushback' = 'Yes' then 'Community opposition reported' end
  ], ' • '), ''),
  current_date
from rows
where c->>0 is not null and c->>1 is not null
  and (c->>0)::float8 <> 0 and (c->>1)::float8 <> 0
on conflict (source, source_id) do update
  set name = excluded.name, lat = excluded.lat, lng = excluded.lng,
      status = excluded.status, notes = excluded.notes, last_seen = excluded.last_seen;

alter table public.data_centers enable trigger data_centers_change_log;

insert into public.changes (dataset, change_type, change_date, summary, details)
select 'data_centers', 'imported', current_date,
       'Added the FracTracker U.S. data-center tracker — proposed, under-construction, and operating sites',
       jsonb_build_object('source', 'FracTracker')
where not exists (
  select 1 from public.changes where dataset = 'data_centers' and details->>'source' = 'FracTracker'
);
