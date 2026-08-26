import type { VEvent } from "./ical";

// A county calendar we auto-ingest upcoming public hearings from. Feed URLs are
// env-overridable so we can retarget without a deploy while dialing in the real
// endpoints.
export type IngestSource = {
  slug: string; // → source = `ingest:<slug>`
  name: string;
  jurisdictionName: string;
  jurisdictionState: string;
  defaultLat: number; // fallback location (the government center)
  defaultLng: number;
  howToCommentUrl: string;
  calendarUrl: string; // human-facing calendar, used as source link
  icalFeeds: string[];
  // Optional Granicus agenda source for v2 enrichment (scan agendas for
  // data-center items and attach them to the matching hearing candidate).
  granicus?: { base: string; viewIds: string[] };
};

function envList(name: string, fallback: string[]): string[] {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const SOURCES: IngestSource[] = [
  {
    slug: "loudoun",
    name: "Loudoun County",
    jurisdictionName: "Loudoun County",
    jurisdictionState: "VA",
    defaultLat: 39.1155,
    defaultLng: -77.5644,
    howToCommentUrl: "https://www.loudoun.gov/SignUpToSpeak",
    calendarUrl: "https://www.loudoun.gov/calendar.aspx?CID=14",
    // CivicEngage "County Meetings" calendar (CID=14) iCal export — verified live.
    icalFeeds: envList("INGEST_LOUDOUN_ICAL", [
      "https://www.loudoun.gov/common/modules/iCalendar/iCalendar.aspx?catID=14&feed=calendar",
    ]),
    granicus: {
      base: process.env.INGEST_LOUDOUN_GRANICUS_BASE || "https://loudoun.granicus.com",
      viewIds: envList("INGEST_LOUDOUN_GRANICUS_VIEWS", ["88", "90", "77", "86", "89", "2", "3"]),
    },
  },
];

// Which calendar entries are worth staging: the public hearings before the two
// bodies that decide data-center special exceptions. This is the highest-signal
// slice — the county calendar carries no agenda text, so the admin confirms the
// data-center-relevant ones after checking each agenda.
const HEARING_BODY = /(planning commission|board of supervisors)/i;

// Signals that a staged meeting's agenda is data-center relevant (used to
// enrich + prioritize; matched against the agenda text when available).
const DC_KEYWORDS: RegExp[] = [
  /\bdata\s?cent(?:er|re)s?\b/i,
  /\b(?:SPEX|ZMAP|ZCPA|ZOAM|ZRTD|ZRTS|CMPT|SPMI|LEGI)-?\d{2,}/i,
  /\bspecial exception\b/i,
];

export function isRelevantMeeting(summary: string): boolean {
  return /public hearing/i.test(summary) && HEARING_BODY.test(summary);
}

export function matchDataCenter(text: string): string[] {
  const hits: string[] = [];
  for (const re of DC_KEYWORDS) {
    const m = re.exec(text);
    if (m) hits.push(m[0]);
  }
  return [...new Set(hits.map((h) => h.trim()))];
}

// Small stable hash for a synthetic source_id when the feed omits a UID.
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export type Candidate = {
  title: string;
  event_type: "hearing" | "meeting";
  status: "pending_review";
  confirmed: false;
  starts_at: string; // ISO
  lat: number;
  lng: number;
  description: string;
  how_to_comment_url: string;
  source: string; // `ingest:<slug>`
  source_url: string | null;
  source_id: string;
  dcMatched: boolean;
};

// Turn a parsed VEVENT into a stageable candidate. `agendaText` is optional
// enrichment (the fetched agenda body) used to flag data-center relevance.
export function buildCandidate(
  src: IngestSource,
  ev: VEvent,
  agendaText?: string
): Candidate | null {
  if (!ev.start) return null;
  const summary = ev.summary.trim();
  if (!summary) return null;

  const haystack = `${summary}\n${ev.description}\n${agendaText ?? ""}`;
  const dcHits = matchDataCenter(haystack);
  const isHearing = /public hearing/i.test(summary);

  const stableKey = ev.uid?.trim() || hash(`${summary}|${ev.start.toISOString()}`);

  const notes = dcHits.length
    ? `Agenda mentions: ${dcHits.join(", ")}. `
    : "";

  return {
    title: summary.slice(0, 200),
    event_type: isHearing ? "hearing" : "meeting",
    status: "pending_review",
    confirmed: false,
    starts_at: ev.start.toISOString(),
    lat: src.defaultLat,
    lng: src.defaultLng,
    description:
      `${notes}Auto-detected from the ${src.name} calendar — verify the agenda and the exact time before confirming.`.slice(
        0,
        1000
      ),
    how_to_comment_url: src.howToCommentUrl,
    source: `ingest:${src.slug}`,
    source_url: ev.url && /^https?:\/\//i.test(ev.url) ? ev.url : src.calendarUrl,
    source_id: `${src.slug}:${stableKey}`.slice(0, 200),
    dcMatched: dcHits.length > 0,
  };
}
