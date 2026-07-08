import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const MAX_RADIUS_MILES = 60;

function toNumber(value: string | null): number | null {
  if (value == null) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

// Verified/visible civic events, optionally within a radius of a point.
// Public read (RLS allows anon select of non-rejected/cancelled events).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = toNumber(searchParams.get("lat"));
  const lng = toNumber(searchParams.get("lng"));
  const radius = Math.min(toNumber(searchParams.get("radius")) ?? 25, MAX_RADIUS_MILES);

  const supabase = createServerClient();
  let query = supabase
    .from("civic_events")
    .select(
      "id,title,event_type,status,confirmed,starts_at,comment_deadline,lat,lng,description,how_to_comment_url,source,source_url,data_center_id,jurisdiction:jurisdictions(name,state,timezone)"
    )
    .in("status", ["scheduled", "postponed", "decided"])
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(200);

  if (lat != null && lng != null) {
    const latDelta = radius / 69;
    const lngDelta = radius / (69 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
    query = query
      .gte("lat", lat - latDelta)
      .lte("lat", lat + latDelta)
      .gte("lng", lng - lngDelta)
      .lte("lng", lng + lngDelta);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, events: data ?? [] });
}
