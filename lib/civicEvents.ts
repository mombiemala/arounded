// Shared types + helpers for the Decision Alerts layer (civic_events).

export type Jurisdiction = {
  name: string | null;
  state: string | null;
  timezone: string | null;
};

export type CivicEvent = {
  id: string;
  title: string;
  event_type: string;
  status: string;
  confirmed: boolean;
  starts_at: string | null;
  comment_deadline: string | null;
  lat: number;
  lng: number;
  description: string | null;
  how_to_comment_url: string | null;
  source: string;
  source_url: string | null;
  data_center_id: string | null;
  jurisdiction?: Jurisdiction | null;
};

export const EVENT_TYPE_LABEL: Record<string, string> = {
  hearing: "Public hearing",
  vote: "Board vote",
  comment_deadline: "Comment deadline",
  meeting: "Public meeting",
};

export const EVENT_TYPES = [
  { value: "hearing", label: "Public hearing" },
  { value: "vote", label: "Board vote" },
  { value: "comment_deadline", label: "Comment deadline" },
  { value: "meeting", label: "Public meeting" },
] as const;

// The soonest date that matters: comment deadline first, else the hearing date.
export function eventTarget(e: Pick<CivicEvent, "comment_deadline" | "starts_at">): string | null {
  return e.comment_deadline ?? e.starts_at ?? null;
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function formatEventDate(iso: string | null, timezone?: string | null): string {
  if (!iso) return "Date TBD";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: timezone || undefined,
    });
  } catch {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
}

export function countdownLabel(iso: string | null): string {
  const d = daysUntil(iso);
  if (d == null) return "";
  if (d < 0) return "Passed";
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  return `in ${d} days`;
}
