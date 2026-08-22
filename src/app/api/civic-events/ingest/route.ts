import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseICal } from "@/lib/ingest/ical";
import { SOURCES, isRelevantMeeting, buildCandidate, type Candidate } from "@/lib/ingest/sources";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HORIZON_DAYS = 120;
const MAX_ENRICH = 8; // cap agenda fetches per run to stay within the time budget

async function fetchText(url: string, ms: number): Promise<{ text: string | null; status: number; error?: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "AroundedIngest/1.0 (+https://arounded.kamalacreated.com)" },
      redirect: "follow",
    });
    const text = res.ok ? await res.text() : null;
    return { text, status: res.status };
  } catch (e) {
    return { text: null, status: 0, error: e instanceof Error ? e.message : "fetch failed" };
  } finally {
    clearTimeout(t);
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .slice(0, 200_000);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dry") === "1";

  // Optional shared-secret guard (matches Vercel cron's Authorization header if set).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const key = searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = Date.now();
  const horizon = now + HORIZON_DAYS * 86_400_000;
  const report: Record<string, unknown>[] = [];
  let totalStaged = 0;

  for (const src of SOURCES) {
    const { data: jz } = await admin
      .from("jurisdictions")
      .select("id")
      .eq("name", src.jurisdictionName)
      .eq("state", src.jurisdictionState)
      .maybeSingle();
    const jurisdictionId = (jz as { id: string } | null)?.id ?? null;

    for (const feed of src.icalFeeds) {
      const res = await fetchText(feed, 9000);
      const entry: Record<string, unknown> = { source: src.slug, feed, status: res.status };
      if (!res.text) {
        entry.error = res.error ?? `no body (status ${res.status})`;
        report.push(entry);
        continue;
      }

      const events = parseICal(res.text);
      const upcoming = events.filter(
        (e) => e.start && e.start.getTime() >= now && e.start.getTime() <= horizon
      );
      const relevant = upcoming.filter((e) => isRelevantMeeting(e.summary));
      entry.parsed = events.length;
      entry.upcoming = upcoming.length;
      entry.relevant = relevant.length;
      entry.sampleTitles = relevant.slice(0, 5).map((e) => e.summary);

      // Best-effort agenda enrichment (bounded) to flag data-center relevance.
      const candidates: Candidate[] = [];
      let enriched = 0;
      for (const ev of relevant) {
        let agendaText: string | undefined;
        if (ev.url && enriched < MAX_ENRICH) {
          enriched++;
          const a = await fetchText(ev.url, 5000);
          if (a.text) agendaText = htmlToText(a.text);
        }
        const c = buildCandidate(src, ev, agendaText);
        if (c) candidates.push({ ...c, jurisdiction_id: jurisdictionId } as Candidate & { jurisdiction_id: string | null });
      }
      entry.candidates = candidates.length;
      entry.dcMatches = candidates.filter((c) => c.dcMatched).length;

      if (!dryRun && candidates.length > 0) {
        const rows = candidates.map(({ dcMatched, ...row }) => {
          void dcMatched;
          return row;
        });
        const { error, count } = await admin
          .from("civic_events")
          .upsert(rows, { onConflict: "source,source_id", ignoreDuplicates: true, count: "exact" });
        if (error) entry.upsertError = error.message;
        else {
          entry.staged = count ?? 0;
          totalStaged += count ?? 0;
        }
      }
      report.push(entry);
    }
  }

  return NextResponse.json({ ok: true, dryRun, totalStaged, sources: report });
}
