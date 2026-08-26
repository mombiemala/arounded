// Minimal RSS parser for Granicus ViewPublisher agenda feeds
// (`/ViewPublisherRSS.php?view_id=N&mode=agendas`). Each <item> is a meeting
// with a title, a link to the agenda, and a pubDate.

export type RssItem = {
  title: string;
  link: string | null;
  pubDate: string | null;
  description: string;
};

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function tag(block: string, name: string): string {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = re.exec(block);
  return m ? decodeXml(m[1]) : "";
}

export function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const parts = xml.split(/<item\b[^>]*>/i).slice(1);
  for (const part of parts) {
    const body = part.split(/<\/item>/i)[0];
    items.push({
      title: tag(body, "title"),
      link: tag(body, "link") || null,
      pubDate: tag(body, "pubDate") || null,
      description: tag(body, "description"),
    });
  }
  return items;
}

export type YMD = { y: number; m: number; d: number };

// Which body a meeting/candidate title refers to.
export function bodyOf(title: string): "pc" | "bos" | null {
  if (/planning commission/i.test(title)) return "pc";
  if (/board of supervisors/i.test(title)) return "bos";
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Parse the "- Jul 23, 2026" date embedded in a Granicus meeting title. This is
// the actual meeting date (tz-independent), unlike the feed's server pubDate.
export function parseTitleDate(title: string): YMD | null {
  const m = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/i.exec(title);
  if (!m) return null;
  const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (mon === undefined) return null;
  return { y: +m[3], m: mon, d: +m[2] };
}

// The calendar date of an ISO timestamp in America/New_York (the pilot's zone),
// so a candidate's stored UTC time compares correctly to a meeting date.
export function easternYMD(iso: string): YMD | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = get("year");
  if (!y) return null;
  return { y, m: get("month") - 1, d: get("day") };
}

export function sameYMD(a: YMD | null, b: YMD | null): boolean {
  return !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d;
}

// Pull concise data-center references out of agenda text. Returns [] unless the
// agenda actually mentions a data center, so generic special exceptions don't
// trigger a false flag. Includes any land-use application codes present.
export function extractDcItems(text: string): string[] {
  if (!/data\s?cent(?:er|re)/i.test(text)) return [];
  const items = new Set<string>();
  const codeRe = /\b(?:SPEX|ZMAP|ZCPA|ZOAM|ZRTD|ZRTS|ZCPD|CMPT|SPMI|LEGI)-\d{4}-\d{2,4}/gi;
  for (const m of text.matchAll(codeRe)) items.add(m[0].toUpperCase());
  const dcRe = /([A-Za-z0-9][\w .,'&/-]{0,60}?data\s?cent(?:er|re)s?[\w .,'&/-]{0,30})/gi;
  for (const m of text.matchAll(dcRe)) {
    const s = m[1].replace(/\s+/g, " ").trim();
    if (s.length > 5) items.add(s.slice(0, 90));
  }
  return [...items].slice(0, 8);
}
