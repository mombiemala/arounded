import { NextResponse } from "next/server";
import { serviceClient, bearerToken, requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Admin-only: submissions awaiting confirmation — community-submitted hearings
// plus auto-ingested candidates staged from county calendars (pending_review).
export async function GET(request: Request) {
  const who = await requireAdmin(bearerToken(request));
  if (!who) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 403 });
  }

  const admin = serviceClient();
  const { data, error } = await admin
    .from("civic_events")
    .select(
      "id,title,event_type,status,confirmed,starts_at,comment_deadline,lat,lng,description,how_to_comment_url,source,source_url,created_at,jurisdiction:jurisdictions(name,state)"
    )
    .eq("confirmed", false)
    .in("status", ["scheduled", "postponed", "pending_review"])
    .or("source.eq.community,source.like.ingest:*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, events: data ?? [] });
}
