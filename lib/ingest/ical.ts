// Minimal, dependency-free iCalendar (RFC 5545) parser — enough to pull
// VEVENTs out of a government calendar feed. Handles line unfolding, escaped
// characters, and the common DTSTART date/date-time forms.

export type VEvent = {
  uid: string | null;
  summary: string;
  description: string;
  location: string;
  url: string | null;
  start: Date | null;
  allDay: boolean;
};

function unfold(raw: string): string[] {
  // RFC 5545 line folding: a CRLF followed by a space/tab continues the line.
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const out: string[] = [];
  for (const line of normalized.split("\n")) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescape(v: string): string {
  return v
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

// Split "DTSTART;TZID=America/New_York:20260915T180000" into name, params, value.
function splitProp(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = left.split(";");
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq !== -1) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { name, params, value };
}

// Parse an iCal date/date-time value. Returns { date, allDay }.
function parseDate(value: string, params: Record<string, string>): { date: Date | null; allDay: boolean } {
  const v = value.trim();
  // Date only: 20260915
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly || params.VALUE === "DATE") {
    const m = dateOnly ?? /^(\d{4})(\d{2})(\d{2})/.exec(v);
    if (!m) return { date: null, allDay: true };
    return { date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12, 0, 0)), allDay: true };
  }
  // Date-time, UTC: 20260915T180000Z
  const utc = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(v);
  if (utc) {
    return {
      date: new Date(Date.UTC(+utc[1], +utc[2] - 1, +utc[3], +utc[4], +utc[5], +utc[6])),
      allDay: false,
    };
  }
  // Date-time, local/floating (optionally with TZID). We can't fully resolve
  // arbitrary TZIDs without a tz database; assume US Eastern (the pilot's zone)
  // by applying a fixed -04:00/-05:00 is unreliable, so treat as Eastern via a
  // best-effort offset embedded by most feeds. Fall back to UTC parse.
  const local = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(v);
  if (local) {
    // Interpret as America/New_York wall-clock. Determine EDT vs EST roughly by
    // month (Mar–Oct → EDT/-4, else EST/-5). Good enough for hearing reminders.
    const month = +local[2];
    const offset = month >= 3 && month <= 10 ? 4 : 5;
    const iso = `${local[1]}-${local[2]}-${local[3]}T${local[4]}:${local[5]}:${local[6]}-0${offset}:00`;
    const d = new Date(iso);
    return { date: Number.isNaN(d.getTime()) ? null : d, allDay: false };
  }
  const d = new Date(v);
  return { date: Number.isNaN(d.getTime()) ? null : d, allDay: false };
}

export function parseICal(text: string): VEvent[] {
  const lines = unfold(text);
  const events: VEvent[] = [];
  let cur: Partial<VEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = { summary: "", description: "", location: "", url: null, uid: null, start: null, allDay: false };
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        events.push({
          uid: cur.uid ?? null,
          summary: cur.summary ?? "",
          description: cur.description ?? "",
          location: cur.location ?? "",
          url: cur.url ?? null,
          start: cur.start ?? null,
          allDay: cur.allDay ?? false,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const prop = splitProp(line);
    if (!prop) continue;
    switch (prop.name) {
      case "UID":
        cur.uid = prop.value.trim();
        break;
      case "SUMMARY":
        cur.summary = unescape(prop.value);
        break;
      case "DESCRIPTION":
        cur.description = unescape(prop.value);
        break;
      case "LOCATION":
        cur.location = unescape(prop.value);
        break;
      case "URL":
        cur.url = prop.value.trim();
        break;
      case "DTSTART": {
        const { date, allDay } = parseDate(prop.value, prop.params);
        cur.start = date;
        cur.allDay = allDay;
        break;
      }
      default:
        break;
    }
  }
  return events;
}
