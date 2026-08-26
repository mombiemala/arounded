import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseICal } from "@/lib/ingest/ical";
import { parseRss, bodyOf, parseTitleDate, easternYMD, sameYMD, extractDcItems } from "@/lib/ingest/granicus";
import { SOURCES, isRelevantMeeting, buildCandidate, matchDataCenter, type Candidate } from "@/lib/ingest/sources";

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

      if (dryRun) {
        entry.feedMentionsDC = /data\s?cent(?:er|re)/i.test(res.text);
        entry.sampleEvents = relevant.slice(0, 6).map((e) => ({
          summary: e.summary,
          hasUrl: !!e.url,
          descLen: e.description.length,
          url: e.url,
        }));
        // Probe agenda enrichment on the first few events that carry a URL.
        const probes: Record<string, unknown>[] = [];
        for (const e of relevant.filter((e) => e.url && /^https?:\/\//i.test(e.url)).slice(0, 3)) {
          const a = await fetchText(e.url!, 6000);
          const txt = a.text ? htmlToText(a.text) : "";
          probes.push({ url: e.url, status: a.status, agendaLen: txt.length, dcHits: matchDataCenter(txt), err: a.error });
        }
        entry.agendaProbes = probes;
      }

      // Best-effort agenda enrichment (bounded) to flag data-center relevance.
      const candidates: Candidate[] = [];
      let enriched = 0;
      for (const ev of relevant) {
        let agendaText: string | undefined;
        if (ev.url && /^https?:\/\//i.test(ev.url) && enriched < MAX_ENRICH) {
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

    // v2 discovery: probe Granicus agenda feeds to find which view carries the
    // PC/BOS public-hearing agendas and what the agenda links look like.
    if (dryRun && src.granicus) {
      const g: Record<string, unknown>[] = [];
      let primaryItems: { title: string; link: string | null }[] = [];
      for (const v of src.granicus.viewIds) {
        const url = `${src.granicus.base}/ViewPublisherRSS.php?view_id=${v}&mode=agendas`;
        const r = await fetchText(url, 8000);
        const items = r.text ? parseRss(r.text) : [];
        g.push({
          view_id: v,
          status: r.status,
          items: items.length,
          sample: items.slice(0, 5).map((i) => ({ title: i.title, link: i.link, pubDate: i.pubDate })),
          err: r.error,
        });
        if (!primaryItems.length && items.length) primaryItems = items;
      }
      // Validate agenda scanning: fetch a few agendas via both viewer endpoints
      // and report which one yields scannable text + data-center hits.
      const agendaScan: Record<string, unknown>[] = [];
      for (const it of primaryItems.slice(0, 3)) {
        if (!it.link) continue;
        const genUrl = it.link.replace("/AgendaViewer.php", "/GeneratedAgendaViewer.php");
        const [a, b] = await Promise.all([fetchText(it.link, 8000), fetchText(genUrl, 8000)]);
        const at = a.text ? htmlToText(a.text) : "";
        const bt = b.text ? htmlToText(b.text) : "";
        const snip = (txt: string) => {
          const m = /data\s?cent(?:er|re)/i.exec(txt);
          if (!m) return "";
          return txt.slice(Math.max(0, m.index - 80), m.index + 160);
        };
        agendaScan.push({
          title: it.title,
          agendaViewer: { status: a.status, len: at.length, dcHits: matchDataCenter(at) },
          generated: { status: b.status, len: bt.length, dcHits: matchDataCenter(bt), snippet: snip(bt) },
          dcItems: extractDcItems(at.length >= bt.length ? at : bt),
        });
      }
      report.push({ source: src.slug, granicus: g, agendaScan });
    }

    // v2 enrichment: match each staged hearing to its Granicus agenda by date +
    // body, scan for data-center items, and rewrite the candidate with the
    // specific applications. Only touches not-yet-enriched pending_review rows,
    // so it's idempotent and never clobbers an admin edit.
    if (!dryRun && src.granicus) {
      const feedUrl = `${src.granicus.base}/ViewPublisherRSS.php?view_id=${src.granicus.currentViewId}&mode=agendas`;
      const r = await fetchText(feedUrl, 9000);
      const items = (r.text ? parseRss(r.text) : [])
        .map((it) => ({ link: it.link, body: bodyOf(it.title), date: parseTitleDate(it.title) }))
        .filter((it) => it.link && it.body && it.date);
      const { data: cands } = await admin
        .from("civic_events")
        .select("id,title,starts_at,source_url")
        .eq("source", `ingest:${src.slug}`)
        .eq("status", "pending_review")
        .gte("starts_at", new Date().toISOString());
      let enriched = 0;
      for (const c of (cands ?? []) as { id: string; title: string; starts_at: string; source_url: string | null }[]) {
        if (c.source_url && /AgendaViewer/i.test(c.source_url)) continue; // already enriched
        const cb = bodyOf(c.title);
        const cd = easternYMD(c.starts_at);
        if (!cb || !cd) continue;
        const match = items.find((it) => it.body === cb && sameYMD(it.date, cd));
        if (!match || !match.link) continue;
        const a = await fetchText(match.link, 8000);
        const dcItems = a.text ? extractDcItems(htmlToText(a.text)) : [];
        if (!dcItems.length) continue;
        const label = cb === "pc" ? "Planning Commission" : "Board of Supervisors";
        await admin
          .from("civic_events")
          .update({
            title: `${label} public hearing — data-center item${dcItems.length > 1 ? "s" : ""}`.slice(0, 200),
            description: `Agenda includes data-center matter(s): ${dcItems.join("; ")}. Auto-detected from the county agenda — verify and confirm to publish.`.slice(0, 1000),
            source_url: match.link,
            updated_at: new Date().toISOString(),
          })
          .eq("id", c.id);
        enriched++;
      }
      report.push({ source: src.slug, enrichedFromAgenda: enriched });
    }
  }

  return NextResponse.json({ ok: true, dryRun, totalStaged, sources: report });
}
