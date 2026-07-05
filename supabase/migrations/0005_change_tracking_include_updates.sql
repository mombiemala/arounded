-- Broaden data-center change tracking to also log meaningful UPDATEs
-- (renamed or moved facilities), not just add/remove. Applied to prod.
-- Guarded so the weekly last_seen refresh does NOT produce noise.

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
  elsif (tg_op = 'UPDATE') then
    if (new.name is distinct from old.name)
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

drop trigger if exists data_centers_change_log on public.data_centers;
create trigger data_centers_change_log
  after insert or update or delete on public.data_centers
  for each row execute function public.log_data_center_change();
