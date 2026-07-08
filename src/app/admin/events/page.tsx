"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { useAuth } from "@/lib/useAuth";
import {
  EVENT_TYPE_LABEL,
  eventTarget,
  formatEventDate,
  type CivicEvent,
} from "@/lib/civicEvents";

type Row = Omit<CivicEvent, "jurisdiction"> & {
  jurisdiction: { name: string | null; state: string | null } | null;
};

export default function AdminEventsPage() {
  const { loading: authLoading } = useAuth();
  const [state, setState] = useState<"loading" | "denied" | "ready" | "signedout">("loading");
  const [events, setEvents] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const token = useCallback(async () => {
    const { data } = await createBrowserClient().auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const load = useCallback(async () => {
    const t = await token();
    if (!t) {
      setState("signedout");
      return;
    }
    const res = await fetch("/api/civic-events/pending", { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 403) {
      setState("denied");
      return;
    }
    const json = await res.json();
    setEvents((json.events ?? []) as Row[]);
    setState("ready");
  }, [token]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const moderate = async (id: string, action: "confirm" | "reject") => {
    setBusy(id);
    try {
      const t = await token();
      const res = await fetch("/api/civic-events/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-brand mb-3">Moderation</div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Review submissions</h1>
        <p className="opacity-70 leading-relaxed max-w-2xl mb-10">
          Community-submitted hearings appear live, badged &quot;unconfirmed.&quot; Confirm the ones you&apos;ve
          verified against the jurisdiction, or reject spam and duplicates.
        </p>

        {state === "loading" && <p className="opacity-60 text-sm">Loading…</p>}

        {state === "signedout" && (
          <p className="border-l-2 border-white/15 pl-4 text-sm opacity-70">
            <Link href="/login" className="text-brand hover:text-brand-strong">Sign in</Link> with an admin
            account to review submissions.
          </p>
        )}

        {state === "denied" && (
          <p className="border-l-2 border-white/15 pl-4 text-sm opacity-70">
            This area is for moderators. If that should be you, add your email to the admin allowlist or set
            your account as an admin.
          </p>
        )}

        {state === "ready" && events.length === 0 && (
          <p className="border-l-2 border-white/15 pl-4 text-sm opacity-70">
            Nothing waiting for review. New community submissions will show up here.
          </p>
        )}

        {state === "ready" && events.length > 0 && (
          <ul className="divide-y divide-white/10 border-t border-white/10">
            {events.map((e) => {
              const jz = Array.isArray(e.jurisdiction) ? e.jurisdiction[0] : e.jurisdiction;
              const place = jz ? [jz.name, jz.state].filter(Boolean).join(", ") : null;
              return (
                <li key={e.id} className="py-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-55 mb-1">
                        {EVENT_TYPE_LABEL[e.event_type] ?? e.event_type}
                        {place ? ` · ${place}` : ""}
                      </div>
                      <div className="font-semibold leading-snug">{e.title}</div>
                      <div className="text-sm opacity-60 mt-1">
                        {formatEventDate(eventTarget(e))}
                        {e.comment_deadline && e.starts_at
                          ? ` · comment closes ${formatEventDate(e.comment_deadline)}`
                          : ""}
                      </div>
                      {e.description && <p className="text-sm opacity-70 mt-1.5 max-w-xl">{e.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                        {e.how_to_comment_url && (
                          <a href={e.how_to_comment_url} target="_blank" rel="noopener noreferrer" className="text-brand hover:text-brand-strong">
                            Comment link
                          </a>
                        )}
                        {e.source_url && (
                          <a href={e.source_url} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100">
                            Source
                          </a>
                        )}
                        <a href={`/map?lat=${e.lat}&lng=${e.lng}`} className="opacity-60 hover:opacity-100">
                          On the map
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => moderate(e.id, "confirm")}
                        disabled={busy === e.id}
                        className="px-3 py-1.5 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong transition-colors disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => moderate(e.id, "reject")}
                        disabled={busy === e.id}
                        className="px-3 py-1.5 rounded-lg border border-white/20 text-sm hover:border-clay hover:text-clay transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
