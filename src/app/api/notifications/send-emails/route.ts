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

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
};

function digestHtml(items: NotificationRow[], siteUrl: string, unsubUrl: string): string {
  const rows = items
    .map(
      (n) => `
      <tr><td style="padding:12px 0;border-bottom:1px solid #eee;">
        <div style="font-weight:600;font-size:15px;color:#111;">${escapeHtml(n.title)}</div>
        ${n.body ? `<div style="font-size:14px;color:#444;margin-top:2px;">${escapeHtml(n.body)}</div>` : ""}
        ${n.link ? `<a href="${siteUrl}${escapeHtml(n.link)}" style="font-size:13px;color:#0d8b9a;">View on the map →</a>` : ""}
      </td></tr>`
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="font-size:18px;font-weight:700;color:#111;">Arounded</div>
      <div style="font-size:14px;color:#555;margin-top:4px;">Updates near the places you saved</div>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">${rows}</table>
      <div style="font-size:12px;color:#999;margin-top:24px;line-height:1.6;">
        You're getting this because you saved a place on Arounded and asked to be alerted about nearby changes.<br/>
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

  try {
    const supabase = getSupabase();

    const { data: pending, error } = await supabase
      .from("notifications")
      .select("id,user_id,title,body,link")
      .is("emailed_at", null)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;

    const rows = (pending ?? []) as NotificationRow[];
    if (rows.length === 0) return NextResponse.json({ ok: true, sent: 0, users: 0 });

    // Group notifications by user.
    const byUser = new Map<string, NotificationRow[]>();
    for (const r of rows) {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r);
      byUser.set(r.user_id, list);
    }

    // Opt-out preferences for the affected users.
    const userIds = [...byUser.keys()];
    const { data: settings } = await supabase
      .from("user_settings")
      .select("user_id,email_alerts")
      .in("user_id", userIds);
    const optedOut = new Set(
      (settings ?? []).filter((s) => s.email_alerts === false).map((s) => s.user_id)
    );

    const now = new Date().toISOString();
    let sent = 0;
    let usersEmailed = 0;

    for (const [userId, items] of byUser) {
      const ids = items.map((i) => i.id);

      // Opted out: mark handled so we don't reprocess, but don't email.
      if (optedOut.has(userId)) {
        await supabase.from("notifications").update({ emailed_at: now }).in("id", ids);
        continue;
      }

      const { data: userRes } = await supabase.auth.admin.getUserById(userId);
      const email = userRes?.user?.email;
      if (!email) {
        // No address to send to — mark handled to avoid retrying forever.
        await supabase.from("notifications").update({ emailed_at: now }).in("id", ids);
        continue;
      }

      const unsubUrl = `${siteUrl}/api/notifications/unsubscribe?token=${makeUnsubToken(userId)}`;
      const subject =
        items.length === 1 ? items[0].title : `${items.length} updates near your saved places`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: email,
          subject,
          html: digestHtml(items, siteUrl, unsubUrl),
        }),
      });

      if (res.ok) {
        await supabase.from("notifications").update({ emailed_at: now }).in("id", ids);
        sent += items.length;
        usersEmailed += 1;
      }
      // On failure, leave emailed_at null so the next run retries.
    }

    return NextResponse.json({ ok: true, sent, users: usersEmailed });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
