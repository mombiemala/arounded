-- 0010: Harden SECURITY DEFINER helpers. These functions are only ever meant to
-- run from triggers (which execute regardless of caller EXECUTE grants) or from
-- the service-role cron (which bypasses grants). Left public, they are reachable
-- via PostgREST at /rest/v1/rpc/<fn>, letting anon/authenticated callers invoke
-- privileged inserts directly (e.g. spamming notifications to arbitrary users).
-- Revoke EXECUTE from the exposed roles to close that path. Applied to prod.

revoke execute on function public.emit_event_alerts(uuid, double precision, double precision, text, text, text, text) from anon, authenticated, public;
revoke execute on function public.run_decision_scan() from anon, authenticated, public;
revoke execute on function public.notify_nearby_places(uuid, double precision, double precision, text, text, text) from anon, authenticated, public;
revoke execute on function public.log_civic_event_change() from anon, authenticated, public;
revoke execute on function public.log_data_center_change() from anon, authenticated, public;

-- Pin a stable search_path on the one flagged helper that lacked it.
alter function public.dc_status_label(text) set search_path = public;
