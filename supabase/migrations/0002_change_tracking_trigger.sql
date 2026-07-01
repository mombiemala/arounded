-- NOT YET APPLIED. Apply this AFTER the initial data_centers seed, otherwise
-- the baseline bulk-insert is logged as thousands of "added" changes.
--
-- Populates the `changes` table automatically when facilities appear or
-- disappear from an ingested source, powering the "patterns over time" view.
-- Only INSERT/DELETE are logged (not UPDATE), so routine last_seen refreshes
-- don't create noise.

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
            'Added ' || coalesce(new.name, 'data center'),
            jsonb_build_object('source', new.source));
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

drop trigger if exists data_centers_change_log on public.data_centers;
create trigger data_centers_change_log
  after insert or delete on public.data_centers
  for each row execute function public.log_data_center_change();
