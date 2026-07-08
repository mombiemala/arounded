"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { useAuth } from "@/lib/useAuth";
import { geocodeForward, type PlaceHit } from "@/lib/conditions";
import { EVENT_TYPES } from "@/lib/civicEvents";

export default function DecisionSubmitForm() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<string>("hearing");
  const [startsAt, setStartsAt] = useState("");
  const [commentDeadline, setCommentDeadline] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [description, setDescription] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceHit[]>([]);
  const [place, setPlace] = useState<PlaceHit | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Debounced geocode search for the location.
  useEffect(() => {
    if (place || query.trim().length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setResults(await geocodeForward(query.trim()));
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, place]);

  const reset = () => {
    setTitle("");
    setEventType("hearing");
    setStartsAt("");
    setCommentDeadline("");
    setSourceUrl("");
    setDescription("");
    setQuery("");
    setResults([]);
    setPlace(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!place) {
      setMessage({ type: "error", text: "Search and pick the location this decision is about." });
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");

      const [lng, lat] = place.center;
      const res = await fetch("/api/civic-events/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          event_type: eventType,
          starts_at: startsAt || null,
          comment_deadline: commentDeadline || null,
          lat,
          lng,
          source_url: sourceUrl || null,
          description: description || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Couldn't submit. Try again.");

      setMessage({
        type: "success",
        text: "Thanks — your submission is live and neighbors nearby will be alerted. We review community entries to confirm them.",
      });
      reset();
      setOpen(false);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  const field = "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/40 focus:border-brand/60 transition-colors";
  const labelCls = "block text-xs font-medium mb-1.5 opacity-80";

  if (!user) {
    return (
      <div className="border-t border-white/10 pt-6">
        <p className="text-sm opacity-70 leading-relaxed">
          Know about a hearing or comment deadline near a data center?{" "}
          <Link href="/login" className="text-brand hover:text-brand-strong">Sign in</Link> to add it —
          neighbors who saved that area get alerted.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 pt-6">
      {message && (
        <div
          className={[
            "mb-4 p-3 rounded-lg border text-sm leading-relaxed",
            message.type === "success"
              ? "bg-brand/10 border-brand/40 text-brand"
              : "bg-red-500/15 border-red-500/40 text-red-300",
          ].join(" ")}
        >
          {message.text}
        </div>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2.5 rounded-lg border border-white/20 text-sm font-medium hover:border-brand/60 hover:text-brand transition-colors"
        >
          + Add a hearing or deadline
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-4 max-w-2xl">
          <div>
            <label htmlFor="ev-title" className={labelCls}>What&apos;s happening?</label>
            <input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rezoning hearing for the Sentinel data center"
              className={field}
              required
              minLength={6}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ev-type" className={labelCls}>Type</label>
              <select id="ev-type" value={eventType} onChange={(e) => setEventType(e.target.value)} className={field}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-ground">{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ev-location" className={labelCls}>Location</label>
              {place ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5">
                  <span className="text-sm truncate">{place.place_name}</span>
                  <button type="button" onClick={() => { setPlace(null); setQuery(""); }} className="text-xs opacity-60 hover:opacity-100 shrink-0">Change</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    id="ev-location"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Address, city, or ZIP"
                    className={field}
                    autoComplete="off"
                  />
                  {results.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 overflow-hidden bg-ground shadow-lg">
                      {results.slice(0, 5).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { setPlace(r); setResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 border-b border-white/5 last:border-b-0"
                        >
                          {r.place_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ev-date" className={labelCls}>Hearing / vote date</label>
              <input id="ev-date" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="ev-deadline" className={labelCls}>Comment closes <span className="opacity-50">(if known)</span></label>
              <input id="ev-deadline" type="date" value={commentDeadline} onChange={(e) => setCommentDeadline(e.target.value)} className={field} />
            </div>
          </div>

          <div>
            <label htmlFor="ev-source" className={labelCls}>Link to the agenda or notice <span className="opacity-50">(optional)</span></label>
            <input id="ev-source" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className={field} />
          </div>

          <div>
            <label htmlFor="ev-desc" className={labelCls}>Anything else? <span className="opacity-50">(optional)</span></label>
            <textarea id="ev-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={field} />
          </div>

          <p className="text-xs opacity-55 leading-relaxed">
            Your entry appears immediately, badged &quot;unconfirmed,&quot; and alerts people who saved that area.
            We review submissions to confirm them. Always verify time &amp; how to participate with the jurisdiction.
          </p>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit hearing"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setMessage(null); }}
              className="px-5 py-2.5 rounded-lg border border-white/20 text-sm hover:border-white/40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
