import { createServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

function icsDate(iso: string): string {
  // → YYYYMMDDTHHMMSSZ (UTC)
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function esc(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

// A calendar file (.ics) for one civic event — the "Add to calendar" action in
// alerts and on the Decisions page. Public read (RLS allows visible events).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data: e } = await supabase
    .from("civic_events")
    .select("id,title,event_type,starts_at,comment_deadline,description,how_to_comment_url,status,jurisdiction:jurisdictions(name,state)")
    .eq("id", id)
    .single();

  if (!e || e.status === "rejected" || e.status === "cancelled") {
    return new Response("Event not found", { status: 404 });
  }

  const jz = Array.isArray(e.jurisdiction) ? e.jurisdiction[0] : e.jurisdiction;
  const location = jz ? [jz.name, jz.state].filter(Boolean).join(", ") : "";
  const start = e.starts_at ?? e.comment_deadline;
  if (!start) return new Response("Event has no date", { status: 422 });

  // 1-hour default block for a hearing; deadlines are a point in time.
  const startMs = new Date(start).getTime();
  const endIso = new Date(startMs + 60 * 60 * 1000).toISOString();

  const descParts = [
    e.description || "",
    e.comment_deadline ? `Public comment closes ${new Date(e.comment_deadline).toLocaleString("en-US")}.` : "",
    e.how_to_comment_url ? `How to comment: ${e.how_to_comment_url}` : "",
    "Via Arounded — verify details with the jurisdiction.",
  ].filter(Boolean);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Arounded//Decision Alerts//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:civic-${e.id}@arounded`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(endIso)}`,
    `SUMMARY:${esc(e.title)}`,
    location ? `LOCATION:${esc(location)}` : "",
    `DESCRIPTION:${esc(descParts.join(" "))}`,
    e.how_to_comment_url ? `URL:${esc(e.how_to_comment_url)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="arounded-decision-${e.id.slice(0, 8)}.ics"`,
    },
  });
}
