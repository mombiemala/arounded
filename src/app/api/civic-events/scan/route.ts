import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily cron: emit time-based reminders for upcoming civic events —
//   'lead'     when a decision enters the user's lead window, and
//   'deadline' when a comment window closes within 2 days.
// All matching + dedupe lives in the run_decision_scan() SQL function; the
// email digest cron then delivers the resulting notifications.
export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await admin.rpc("run_decision_scan");
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, alertsEmitted: data ?? 0 });
}
