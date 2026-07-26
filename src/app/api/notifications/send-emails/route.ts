import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { makeUnsubToken } from "@/lib/alertToken";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HEARING_TYPES = new Set([
  "hearing_scheduled",
  "hearing_reminder",
  "comment_deadline",
  "hearing_changed",
]);

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  type: string;
  data: { civic_event_id?: string } | null;
};

type EventLite = {
  id: string;
  title: string;
  starts_at: string | null;
  comment_deadline: string | null;
  how_to_comment_url: string | null;
  confirmed: boolean;
};

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function eventBlock(ev: EventLite, siteUrl: string): string {
  const when = fmtDate(ev.starts_at);
  const deadline = fmtDate(ev.comment_deadline);
  const meta: string[] = [];
  if (when) meta.push(`🗓 ${escapeHtml(when)}`);
  if (deadline) meta.push(`⏳ Comment closes ${escapeHtml(deadline)}`);
  if (!ev.confirmed) meta.push(`<span style="color:#b5741a;">unconfirmed</span>`);

  const metaRow = meta.length
    ? `<div style="font-size:13px;color:#555;margin-top:4px;">${meta.join(" &nbsp;·&nbsp; ")}</div>`
    : "";

  const btns: string[] = [];
  if (ev.how_to_comment_url) {
    btns.push(
      `<a href="${escapeHtml(ev.how_to_comment_url)}" style="display:inline-block;background:#0f9e8c;color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:7px 12px;border-radius:6px;">How to comment →</a>`
    );
  }
  btns.push(
    `<a href="${siteUrl}/api/civic-events/${ev.id}/ics" style="display:inline-block;font-size:13px;color:#0f9e8c;text-decoration:none;padding:7px 4px;">Add to calendar</a>`
  );

  return `${metaRow}<div style="margin-top:8px;">${btns.join("&nbsp;&nbsp;")}</div>`;
}

function digestHtml(
  items: NotificationRow[],
  events: Map<string, EventLite>,
  siteUrl: string,
  unsubUrl: string
): string {
  const rows = items
    .map((n) => {
      const ev = n.data?.civic_event_id ? events.get(n.data.civic_event_id) : undefined;
      const extra = HEARING_TYPES.has(n.type) && ev ? eventBlock(ev, siteUrl) : "";
      return `
      <tr><td style="padding:14px 0;border-bottom:1px solid #eee;">
        <div style="font-weight:600;font-size:15px;color:#111;">${escapeHtml(n.title)}</div>
        ${n.body ? `<div style="font-size:14px;color:#444;margin-top:2px;">${escapeHtml(n.body)}</div>` : ""}
        ${extra}
        ${n.link && !extra ? `<a href="${siteUrl}${escapeHtml(n.link)}" style="font-size:13px;color:#0f9e8c;">View on the map →</a>` : ""}
      </td></tr>`;
    })
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="font-size:18px;font-weight:700;color:#111;">Arounded</div>
      <div style="font-size:14px;color:#555;margin-top:4px;">Updates near the places you saved</div>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${rows}</table>
      <div style="font-size:12px;color:#999;margin-top:24px;line-height:1.6;">
        You're getting this because you saved a place on Arounded and asked to be alerted about nearby changes.<br/>
        Always confirm hearing times and how to participate with the jurisdiction.<br/>
        <a href="${unsubUrl}" style="color:#999;">Unsubscribe from these alerts</a>
      </div>
    </div>
  </body></html>`;
}

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: true, skipped: "RESEND_API_KEY not set" });
  }
  const from = process.env.RESEND_FROM || "Arounded <alerts@arounded.app>";
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

  // Building-phase safety valve. While EMAIL_ALLOWLIST is set, real email is
  // delivered ONLY to those addresses (e.g. your own) — everyone else's alerts
  // stay in-app. Clear the env var to go live for all users.
  const allow = (process.env.EMAIL_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  try {
    const supabase = getSupabase();

    const { data: pending, error } = await supabase
      .from("notifications")
      .select("id,user_id,title,body,link,type,data")
      .is("emailed_at", null)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;

    const rows = (pending ?? []) as NotificationRow[];
    if (rows.length === 0) return NextResponse.json({ ok: true, sent: 0, users: 0 });

    // Fetch the civic events referenced by hearing notifications for rich rendering.
    const eventIds = [
      ...new Set(
        rows
          .filter((r) => HEARING_TYPES.has(r.type) && r.data?.civic_event_id)
          .map((r) => r.data!.civic_event_id as string)
      ),
    ];
    const events = new Map<string, EventLite>();
    if (eventIds.length > 0) {
      const { data: evs } = await supabase
        .from("civic_events")
        .select("id,title,starts_at,comment_deadline,how_to_comment_url,confirmed")
        .in("id", eventIds);
      for (const e of (evs ?? []) as EventLite[]) events.set(e.id, e);
    }

    // Group notifications by user.
    const byUser = new Map<string, NotificationRow[]>();
    for (const r of rows) {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r);
      byUser.set(r.user_id, list);
    }

    // Per-user preferences: email master switch + separate hearing opt-out.
    const userIds = [...byUser.keys()];
    const { data: settings } = await supabase
      .from("user_settings")
      .select("user_id,email_alerts,hearing_alerts")
      .in("user_id", userIds);
    const emailOff = new Set(
      (settings ?? []).filter((s) => s.email_alerts === false).map((s) => s.user_id)
    );
    const hearingOff = new Set(
      (settings ?? []).filter((s) => s.hearing_alerts === false).map((s) => s.user_id)
    );

    const now = new Date().toISOString();
    let sent = 0;
    let usersEmailed = 0;

    for (const [userId, allItems] of byUser) {
      // Drop hearing items for users who opted out of hearing alerts (still
      // recorded in-app); mark them handled so we don't reprocess forever.
      let items = allItems;
      if (hearingOff.has(userId)) {
        const dropped = allItems.filter((i) => HEARING_TYPES.has(i.type)).map((i) => i.id);
        if (dropped.length) await supabase.from("notifications").update({ emailed_at: now }).in("id", dropped);
        items = allItems.filter((i) => !HEARING_TYPES.has(i.type));
      }
      if (items.length === 0) continue;

      const ids = items.map((i) => i.id);

      // Master email opt-out: mark handled, don't email.
      if (emailOff.has(userId)) {
        await supabase.from("notifications").update({ emailed_at: now }).in("id", ids);
        continue;
      }

      const { data: userRes } = await supabase.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      if (!email) {
        await supabase.from("notifications").update({ emailed_at: now }).in("id", ids);
        continue;
      }

      // Safety valve: while an allowlist is set, only deliver to those addresses.
      // Others are marked handled (still visible in-app) so no backlog blasts out
      // when the allowlist is later removed.
      if (allow.length > 0 && !allow.includes(email.toLowerCase())) {
        await supabase.from("notifications").update({ emailed_at: now }).in("id", ids);
        continue;
      }

      const unsubUrl = `${siteUrl}/api/notifications/unsubscribe?token=${makeUnsubToken(userId)}`;
      const subject =
        items.length === 1 ? items[0].title : `${items.length} updates near your saved places`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: email, subject, html: digestHtml(items, events, siteUrl, unsubUrl) }),
      });

      if (res.ok) {
        await supabase.from("notifications").update({ emailed_at: now }).in("id", ids);
        sent += items.length;
        usersEmailed += 1;
      }
    }

    return NextResponse.json({ ok: true, sent, users: usersEmailed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
