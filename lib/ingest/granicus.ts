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
