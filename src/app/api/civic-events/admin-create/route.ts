import { NextResponse } from "next/server";
import { serviceClient, bearerToken, requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

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

// Admin-only: create a confirmed hearing directly (curated from a county
// calendar). Skips the community rate-limit / proximity guards; inserts as
// source='admin', which fires the same nearby-place alert as any real event.
export async function POST(request: Request) {
  const who = await requireAdmin(bearerToken(request));
  if (!who) {
    return NextResponse.json({ ok: false, error: "Not authorized." }, { status: 403 });
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
      { ok: false, error: "A title and a location are required." },
      { status: 400 }
    );
  }

  const admin = serviceClient();

  // Best-effort: attach the nearest pilot jurisdiction by centroid, for tz/label.
  let jurisdictionId: string | null = str(body.jurisdiction_id, 64);
  if (!jurisdictionId) {
    const { data: js } = await admin
      .from("jurisdictions")
      .select("id,centroid_lat,centroid_lng")
      .not("centroid_lat", "is", null);
    if (js && js.length) {
      let best: { id: string; d: number } | null = null;
      for (const j of js as { id: string; centroid_lat: number; centroid_lng: number }[]) {
        const d = Math.abs(j.centroid_lat - lat) + Math.abs(j.centroid_lng - lng);
        if (!best || d < best.d) best = { id: j.id, d };
      }
      if (best && best.d < 1.2) jurisdictionId = best.id; // ~within a county's reach
    }
  }

  const { data: inserted, error } = await admin
    .from("civic_events")
    .insert({
      title,
      event_type: eventType,
      status: "scheduled",
      confirmed: body.confirmed === false ? false : true,
      starts_at: isoOrNull(body.starts_at),
      comment_deadline: isoOrNull(body.comment_deadline),
      lat,
      lng,
      jurisdiction_id: jurisdictionId,
      description: str(body.description, 1000),
      how_to_comment_url: str(body.how_to_comment_url, 500),
      source_url: str(body.source_url, 500),
      source: "admin",
      submitted_by: who.userId,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: inserted?.id });
}
