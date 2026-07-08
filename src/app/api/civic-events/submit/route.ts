import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const DAILY_LIMIT = 5; // submissions per user per day
const DC_PROXIMITY_MILES = 25; // keep submissions on-topic for a data-center tool

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function str(v: unknown, max: number): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

function isoOrNull(v: unknown): string | null {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// Community submission. RLS also permits authenticated inserts, but we route
// through here to enforce a daily rate limit and a data-center-proximity guard
// that RLS can't express. Submissions are stored unconfirmed and — per the
// product decision — alert nearby saved places immediately (badged unconfirmed).
export async function POST(request: Request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Sign in to submit a hearing." }, { status: 401 });
  }

  const admin = serviceClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const userId = userData?.user?.id;
  if (userErr || !userId) {
    return NextResponse.json(
      { ok: false, error: "Your session has expired. Sign in again." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const title = str(body.title, 200);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const eventType = ["hearing", "vote", "comment_deadline", "meeting"].includes(String(body.event_type))
    ? String(body.event_type)
    : "hearing";

  if (!title || title.length < 6 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { ok: false, error: "Add a clear title and pick the location on the map." },
      { status: 400 }
    );
  }

  // Rate limit.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: recent } = await admin
    .from("civic_events")
    .select("id", { count: "exact", head: true })
    .eq("submitted_by", userId)
    .gte("created_at", since);
  if ((recent ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      { ok: false, error: "You've reached today's submission limit. Please try again tomorrow." },
      { status: 429 }
    );
  }

  // On-topic guard: must sit near a tracked data center.
  const latDelta = DC_PROXIMITY_MILES / 69;
  const lngDelta = DC_PROXIMITY_MILES / (69 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const { count: nearbyDc } = await admin
    .from("data_centers")
    .select("id", { count: "exact", head: true })
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);
  if ((nearbyDc ?? 0) === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't find a tracked data center within 25 miles of that spot. Decision Alerts currently covers areas near data centers.",
      },
      { status: 422 }
    );
  }

  const { data: inserted, error: insErr } = await admin
    .from("civic_events")
    .insert({
      title,
      event_type: eventType,
      status: "scheduled",
      confirmed: false,
      starts_at: isoOrNull(body.starts_at),
      comment_deadline: isoOrNull(body.comment_deadline),
      lat,
      lng,
      description: str(body.description, 1000),
      how_to_comment_url: str(body.how_to_comment_url, 500),
      source_url: str(body.source_url, 500),
      source: "community",
      submitted_by: userId,
    })
    .select("id")
    .single();

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted?.id });
}
