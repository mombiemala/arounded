"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  EVENT_TYPE_LABEL,
  eventTarget,
  formatEventDate,
  countdownLabel,
  daysUntil,
  type CivicEvent,
} from "@/lib/civicEvents";

// Upcoming civic decisions near the current map center — the map-side surface
// for Decision Alerts. Fetches the public /nearby route; self-contained so it
// can drop into the map panel without touching the map's state.
export default function NearbyDecisions({ lat, lng }: { lat: number; lng: number }) {
  const [events, setEvents] = useState<CivicEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/civic-events/nearby?lat=${lat}&lng=${lng}&radius=40`);
        const json = await res.json();
        if (cancelled) return;
        const upcoming = ((json.events ?? []) as CivicEvent[])
          .filter((e) => {
            const d = daysUntil(eventTarget(e));
            return d == null || d >= 0;
          })
          .sort((a, b) => {
            const ta = eventTarget(a);
            const tb = eventTarget(b);
            if (!ta) return 1;
            if (!tb) return -1;
            return new Date(ta).getTime() - new Date(tb).getTime();
          })
          .slice(0, 4);
        setEvents(upcoming);
      } catch {
        if (!cancelled) setEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (!events || events.length === 0) return null;

  return (
    <div className="pt-4 border-t border-white/10">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand/80">
          Upcoming decisions nearby
        </div>
        <Link href="/decisions" className="text-[11px] text-brand hover:text-brand-strong">
          All →
        </Link>
      </div>
      <ul className="divide-y divide-white/10 border-t border-white/10">
        {events.map((e) => {
          const target = eventTarget(e);
          const soon = (daysUntil(target) ?? 99) <= 7;
          return (
            <li key={e.id} className="py-2.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.06em] opacity-50">
                  {EVENT_TYPE_LABEL[e.event_type] ?? e.event_type}
                </span>
                {!e.confirmed && e.source !== "sample" && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.06em] text-[#e0a95c]">
                    unconfirmed
                  </span>
                )}
              </div>
              <div className="text-sm leading-snug">{e.title}</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className={soon ? "text-brand" : "opacity-60"}>
                  {formatEventDate(target)}
                  {countdownLabel(target) ? ` · ${countdownLabel(target)}` : ""}
                </span>
                {e.how_to_comment_url && (
                  <a
                    href={e.how_to_comment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:text-brand-strong"
                  >
                    Comment →
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
