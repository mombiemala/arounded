import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import Footer from "@/src/components/Footer";
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
  source_id: string | null;
  jurisdiction: { name: string | null; state: string | null; timezone: string | null } | null;
};

// Header label for the featured card, matched to what kind of decision it is.
function featuredLabel(eventType: string): string {
  if (eventType === "vote") return "Next big vote";
  if (eventType === "hearing") return "Next public hearing";
  if (eventType === "comment_deadline") return "Next comment deadline";
  return "Coming up";
}

function sourceBadge(e: Row): { label: string; cls: string } {
  if (e.source === "sample") return { label: "Example", cls: "text-ink-faint border-line" };
  if (e.confirmed) return { label: "Confirmed", cls: "text-brand border-brand/40" };
  return { label: "Community · unconfirmed", cls: "text-[#ffd43b] border-[#ffd43b]/40" };
}

export default async function DecisionsPage() {
  const { data } = await supabase
    .from("civic_events")
    .select(
      "id,title,event_type,status,confirmed,starts_at,comment_deadline,lat,lng,description,how_to_comment_url,source,source_url,source_id,data_center_id,jurisdiction:jurisdictions(name,state,timezone)"
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

  // Feature the soonest confirmed decision (rows are already sorted soonest-first).
  const featured = rows.find((e) => e.confirmed) ?? null;
  const listRows = featured ? rows.filter((e) => e.id !== featured.id) : rows;

  return (
    <div className="min-h-screen bg-ground text-ink relative overflow-hidden">
      <Navigation />
      <HeroDecor variant="plots" />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative py-16">
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-flame font-bold mb-3">
          Decision alerts
        </div>
        <h1 className="text-5xl sm:text-6xl font-black uppercase tracking-tight leading-[0.9] mb-4">
          Upcoming decisions near data centers
        </h1>
        <p className="opacity-80 leading-relaxed max-w-2xl mb-6">
          Public hearings, board votes, and comment deadlines on data-center projects — so you
          hear about them while you can still weigh in, not after approvals are in place.{" "}
          <Link href="/login" className="text-brand hover:text-brand-strong">Save a place</Link>{" "}
          and we&apos;ll flag it for you when one comes up nearby.
        </p>

        {featured && (() => {
          const target = eventTarget(featured);
          const jz = featured.jurisdiction;
          const place = jz ? [jz.name, jz.state].filter(Boolean).join(", ") : null;
          const countdown = countdownLabel(target);
          return (
            <div className="mb-12 rounded-xl border-2 border-ink overflow-hidden">
              <div className="bg-ink text-ground px-5 sm:px-7 py-2.5 flex items-center justify-between gap-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] font-bold text-flame">
                  ★ {featuredLabel(featured.event_type)}
                </span>
                {countdown && (
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] font-bold">
                    {countdown}
                  </span>
                )}
              </div>
              <div className="p-5 sm:p-7">
                <div className="font-mono text-sm font-bold tabular-nums text-flame mb-2">
                  {formatEventDate(target, jz?.timezone)}
                  {place && <span className="text-ink opacity-55"> · {place}</span>}
                </div>
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-[0.95] mb-3">
                  {featured.title}
                </h2>
                {featured.description && (
                  <p className="opacity-75 leading-relaxed max-w-2xl mb-4">{featured.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {featured.how_to_comment_url && (
                    <a
                      href={featured.how_to_comment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors"
                    >
                      How to comment →
                    </a>
                  )}
                  {(featured.starts_at || featured.comment_deadline) && (
                    <a
                      href={`/api/civic-events/${featured.id}/ics`}
                      className="px-4 py-2 border-2 border-ink rounded-lg font-medium hover:bg-hover transition-colors"
                    >
                      Add to calendar
                    </a>
                  )}
                  {featured.source_url && (
                    <a
                      href={featured.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-center opacity-60 hover:opacity-100"
                    >
                      Source
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {listRows.length === 0 ? (
          <p className="border-l-2 border-line pl-4 text-sm opacity-70 leading-relaxed">
            {featured
              ? "That's the only decision on the calendar right now. Know about another? Add it below."
              : "No upcoming decisions logged yet. Know about one? Add it below."}
          </p>
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {listRows.map((e) => {
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
                      {(e.starts_at || e.comment_deadline) && (
                        <a href={`/api/civic-events/${e.id}/ics`} className="opacity-60 hover:opacity-100">
                          Add to calendar
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

        <p className="mt-10 text-xs opacity-50 leading-relaxed border-l-2 border-line pl-4 max-w-2xl">
          Decision Alerts is informational and community-supported. Dates and processes change —
          always confirm the time and how to participate with the jurisdiction. This isn&apos;t legal advice.
        </p>
      </section>
      <Footer />
    </div>
  );
}
