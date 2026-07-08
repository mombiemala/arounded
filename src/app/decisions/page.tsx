import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import { HeroDecor } from "@/src/components/Decor";
import DecisionSubmitForm from "@/src/components/DecisionSubmitForm";
import { supabase } from "@/lib/supabaseClient";
import {
  EVENT_TYPE_LABEL,
  eventTarget,
  daysUntil,
  formatEventDate,
  countdownLabel,
  type CivicEvent,
} from "@/lib/civicEvents";

export const dynamic = "force-dynamic";

type Row = Omit<CivicEvent, "jurisdiction"> & {
  jurisdiction: { name: string | null; state: string | null; timezone: string | null } | null;
};

function sourceBadge(e: Row): { label: string; cls: string } {
  if (e.source === "sample") return { label: "Example", cls: "text-white/50 border-white/15" };
  if (e.confirmed) return { label: "Confirmed", cls: "text-brand border-brand/40" };
  return { label: "Community · unconfirmed", cls: "text-[#ffd43b] border-[#ffd43b]/40" };
}

export default async function DecisionsPage() {
  const { data } = await supabase
    .from("civic_events")
    .select(
      "id,title,event_type,status,confirmed,starts_at,comment_deadline,lat,lng,description,how_to_comment_url,source,source_url,data_center_id,jurisdiction:jurisdictions(name,state,timezone)"
    )
    .in("status", ["scheduled", "postponed", "decided"])
    .limit(300);

  const rows = ((data ?? []) as unknown as Row[])
    .map((e) => ({ ...e, jurisdiction: Array.isArray(e.jurisdiction) ? e.jurisdiction[0] ?? null : e.jurisdiction }))
    .filter((e) => {
      const d = daysUntil(eventTarget(e));
      return d == null || d >= 0; // upcoming or undated
    })
    .sort((a, b) => {
      const ta = eventTarget(a);
      const tb = eventTarget(b);
      if (!ta) return 1;
      if (!tb) return -1;
      return new Date(ta).getTime() - new Date(tb).getTime();
    });

  return (
    <div className="min-h-screen bg-ground text-white relative overflow-hidden">
      <Navigation />
      <HeroDecor variant="plots" />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative py-16">
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-brand mb-3">
          Decision alerts
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Upcoming decisions near data centers
        </h1>
        <p className="opacity-80 leading-relaxed max-w-2xl mb-6">
          Public hearings, board votes, and comment deadlines on data-center projects — so you
          hear about them while you can still weigh in, not after approvals are in place.{" "}
          <Link href="/login" className="text-brand hover:text-brand-strong">Save a place</Link>{" "}
          and we&apos;ll email you when one comes up nearby.
        </p>

        {rows.length === 0 ? (
          <p className="border-l-2 border-white/15 pl-4 text-sm opacity-70 leading-relaxed">
            No upcoming decisions logged yet. Know about one? Add it below.
          </p>
        ) : (
          <ul className="divide-y divide-white/10 border-t border-white/10">
            {rows.map((e) => {
              const target = eventTarget(e);
              const badge = sourceBadge(e);
              const jz = e.jurisdiction;
              const place = jz ? [jz.name, jz.state].filter(Boolean).join(", ") : null;
              const countdown = countdownLabel(target);
              const soon = (daysUntil(target) ?? 99) <= 7;
              return (
                <li key={e.id} className="py-6 grid sm:grid-cols-[132px_1fr] gap-2 sm:gap-6">
                  <div className="shrink-0">
                    <div className="font-mono text-sm font-semibold tabular-nums">
                      {formatEventDate(target, jz?.timezone)}
                    </div>
                    {countdown && (
                      <div className={`text-xs mt-0.5 ${soon ? "text-brand" : "opacity-55"}`}>{countdown}</div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-55">
                        {EVENT_TYPE_LABEL[e.event_type] ?? e.event_type}
                      </span>
                      <span className={`font-mono text-[10px] uppercase tracking-[0.08em] px-2 py-0.5 rounded border ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <h2 className="font-semibold leading-snug">{e.title}</h2>
                    {place && <div className="text-sm opacity-60 mt-0.5">{place}</div>}
                    {e.comment_deadline && e.starts_at && (
                      <div className="text-xs opacity-55 mt-1">
                        Comment closes {formatEventDate(e.comment_deadline, jz?.timezone)}
                      </div>
                    )}
                    {e.description && (
                      <p className="text-sm opacity-70 leading-relaxed mt-2 max-w-xl">{e.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-sm">
                      {e.how_to_comment_url && (
                        <a href={e.how_to_comment_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-strong">
                          How to comment →
                        </a>
                      )}
                      {e.source_url && (
                        <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100">
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-10">
          <DecisionSubmitForm />
        </div>

        <p className="mt-10 text-xs opacity-50 leading-relaxed border-l-2 border-white/15 pl-4 max-w-2xl">
          Decision Alerts is informational and community-supported. Dates and processes change —
          always confirm the time and how to participate with the jurisdiction. This isn&apos;t legal advice.
        </p>
      </section>
    </div>
  );
}
