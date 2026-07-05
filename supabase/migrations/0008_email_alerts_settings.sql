-- Email delivery for place alerts. Applied to prod.
-- The /api/notifications/send-emails cron reads unsent notifications, batches
-- them per user into a digest, sends via Resend, and stamps emailed_at.

alter table public.notifications
  add column if not exists emailed_at timestamptz;

-- Per-user settings — starts with the email-alerts opt-out (default on).
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  email_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "users manage own settings" on public.user_settings;
create policy "users manage own settings"
  on public.user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
