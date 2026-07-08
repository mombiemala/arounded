"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { geocodeForward, type PlaceHit } from "@/lib/conditions";
import { EVENT_TYPES } from "@/lib/civicEvents";

// Admin quick-entry: add a confirmed hearing curated from a county calendar.
export default function AdminEventForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("hearing");
  const [startsAt, setStartsAt] = useState("");
  const [commentDeadline, setCommentDeadline] = useState("");
  const [howToComment, setHowToComment] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [description, setDescription] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceHit[]>([]);
  const [place, setPlace] = useState<PlaceHit | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    setHowToComment("");
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
      setMessage({ type: "error", text: "Search and pick the location." });
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await createBrowserClient().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Session expired — sign in again.");
      const [lng, lat] = place.center;
      const res = await fetch("/api/civic-events/admin-create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          event_type: eventType,
          starts_at: startsAt || null,
          comment_deadline: commentDeadline || null,
          how_to_comment_url: howToComment || null,
          source_url: sourceUrl || null,
          description: description || null,
          lat,
          lng,
          confirmed: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Couldn't save.");
      setMessage({ type: "success", text: "Added — it's live and confirmed. Nearby saved places were alerted." });
      reset();
      onCreated();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  };

  const field =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/40 focus:border-brand/60 transition-colors";
  const labelCls = "block text-xs font-medium mb-1.5 opacity-80";

  return (
    <div className="mb-10">
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
          className="px-5 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong transition-colors"
        >
          + Add a hearing
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand/80">New hearing</div>

          <div>
            <label htmlFor="a-title" className={labelCls}>Title</label>
            <input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Planning Commission — data center special exception" className={field} required minLength={6} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="a-type" className={labelCls}>Type</label>
              <select id="a-type" value={eventType} onChange={(e) => setEventType(e.target.value)} className={field}>
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-ground">{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="a-loc" className={labelCls}>Location</label>
              {place ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2.5">
                  <span className="text-sm truncate">{place.place_name}</span>
                  <button type="button" onClick={() => { setPlace(null); setQuery(""); }} className="text-xs opacity-60 hover:opacity-100 shrink-0">Change</button>
                </div>
              ) : (
                <div className="relative">
                  <input id="a-loc" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Address, city, or ZIP" className={field} autoComplete="off" />
                  {results.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 overflow-hidden bg-ground shadow-lg">
                      {results.slice(0, 5).map((r) => (
                        <button key={r.id} type="button" onClick={() => { setPlace(r); setResults([]); }} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 border-b border-white/5 last:border-b-0">
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
              <label htmlFor="a-date" className={labelCls}>Hearing / vote date</label>
              <input id="a-date" type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="a-deadline" className={labelCls}>Comment closes <span className="opacity-50">(optional)</span></label>
              <input id="a-deadline" type="date" value={commentDeadline} onChange={(e) => setCommentDeadline(e.target.value)} className={field} />
            </div>
          </div>

          <div>
            <label htmlFor="a-how" className={labelCls}>How-to-comment link <span className="opacity-50">(optional)</span></label>
            <input id="a-how" type="url" value={howToComment} onChange={(e) => setHowToComment(e.target.value)} placeholder="https://…" className={field} />
          </div>

          <div>
            <label htmlFor="a-source" className={labelCls}>Agenda / source link <span className="opacity-50">(optional)</span></label>
            <input id="a-source" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className={field} />
          </div>

          <div>
            <label htmlFor="a-desc" className={labelCls}>Notes <span className="opacity-50">(optional)</span></label>
            <textarea id="a-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={field} />
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong transition-colors disabled:opacity-50">
              {submitting ? "Saving…" : "Add hearing"}
            </button>
            <button type="button" onClick={() => { setOpen(false); setMessage(null); }} className="px-5 py-2.5 rounded-lg border border-white/20 text-sm hover:border-white/40 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
