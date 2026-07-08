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

// Admin-only moderation: confirm, reject, or edit a civic event.
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

  const id = str(body.id, 64);
  const action = String(body.action);
  if (!id) return NextResponse.json({ ok: false, error: "Missing event id." }, { status: 400 });

  const admin = serviceClient();
  const now = new Date().toISOString();

  if (action === "confirm") {
    // Flips the trust badge; no status change, so no duplicate alert fires.
    const { error } = await admin.from("civic_events").update({ confirmed: true, updated_at: now }).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else if (action === "reject") {
    const { error } = await admin.from("civic_events").update({ status: "rejected", updated_at: now }).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else if (action === "edit") {
    const patch: Record<string, unknown> = { updated_at: now };
    if (body.title !== undefined) patch.title = str(body.title, 200);
    if (body.starts_at !== undefined) patch.starts_at = isoOrNull(body.starts_at);
    if (body.comment_deadline !== undefined) patch.comment_deadline = isoOrNull(body.comment_deadline);
    if (body.how_to_comment_url !== undefined) patch.how_to_comment_url = str(body.how_to_comment_url, 500);
    if (body.description !== undefined) patch.description = str(body.description, 1000);
    const { error } = await admin.from("civic_events").update(patch).eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
