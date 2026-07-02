-- Public read access to system-level (non-user) change records for the
-- humanized changelog at /changes. User-attributed rows (user_id set) stay
-- private under RLS.
drop policy if exists "public read system changes" on public.changes;
create policy "public read system changes"
  on public.changes for select
  to anon, authenticated
  using (user_id is null);

-- Seed a first changelog entry documenting the initial data-center import so
-- the changelog has content before the weekly refresh starts producing diffs.
insert into public.changes (dataset, change_type, change_date, summary, details)
select 'data_centers', 'imported', current_date,
       'Imported 1,357 U.S. data centers from PeeringDB',
       jsonb_build_object('source', 'PeeringDB', 'count', 1357)
where not exists (
  select 1 from public.changes
  where dataset = 'data_centers' and change_type = 'imported'
);
