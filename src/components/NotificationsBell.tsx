"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { useAuth } from "@/lib/useAuth";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-xs opacity-80">{label}</span>
      <span className="relative inline-flex items-center shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} aria-label={label} />
        <span className="block w-9 h-5 rounded-full bg-white/15 peer-checked:bg-brand transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ground" />
        <span className="pointer-events-none absolute left-[3px] top-1/2 -translate-y-1/2 translate-x-0 peer-checked:translate-x-4 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform" />
      </span>
    </label>
  );
}

export default function NotificationsBell() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createBrowserClient();

  const [items, setItems] = useState<Notification[]>([]);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [hearingAlerts, setHearingAlerts] = useState(true);
  const [leadDays, setLeadDays] = useState(7);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [notifs, prefs] = await Promise.all([
        supabase
          .from("notifications")
          .select("id,title,body,link,read_at,created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("user_settings").select("email_alerts,hearing_alerts,alert_lead_days").maybeSingle(),
      ]);
      if (cancelled) return;
      setItems((notifs.data ?? []) as Notification[]);
      if (prefs.data) {
        setEmailAlerts(prefs.data.email_alerts !== false);
        setHearingAlerts(prefs.data.hearing_alerts !== false);
        if (prefs.data.alert_lead_days) setLeadDays(prefs.data.alert_lead_days);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  const savePrefs = async (patch: Record<string, unknown>) => {
    if (!user) return;
    await supabase
      .from("user_settings")
      .upsert(
        { user_id: user.id, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
  };

  const toggleEmailAlerts = () => {
    const next = !emailAlerts;
    setEmailAlerts(next);
    savePrefs({ email_alerts: next });
  };

  const toggleHearingAlerts = () => {
    const next = !hearingAlerts;
    setHearingAlerts(next);
    savePrefs({ hearing_alerts: next });
  };

  const changeLeadDays = (days: number) => {
    setLeadDays(days);
    savePrefs({ alert_lead_days: days });
  };

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
  };

  const openItem = async (n: Notification) => {
    setOpen(false);
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    if (n.link) router.push(n.link);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-white/80 hover:text-white hover:bg-white/5 transition-colors"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] border border-white/10 rounded-xl bg-ground/95 backdrop-blur-sm shadow-lg overflow-hidden z-50"
          role="menu"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs opacity-70 hover:opacity-100 underline">
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-3 py-6 text-sm opacity-70 leading-relaxed">
              No notifications yet. Save a place, and we&apos;ll alert you when a data center is
              proposed or changes status nearby.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left px-3 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors ${
                    n.read_at ? "opacity-60" : ""
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at && (
                      <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    )}
                    <div className={n.read_at ? "pl-4" : ""}>
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.body && <div className="text-xs opacity-75 mt-0.5">{n.body}</div>}
                      <div className="text-[11px] opacity-50 mt-1">{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-white/10 px-3 py-3 space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand/80">
              Alert settings
            </div>
            <SwitchRow label="Email me about nearby changes" checked={emailAlerts} onChange={toggleEmailAlerts} />
            <SwitchRow label="Hearings & comment deadlines" checked={hearingAlerts} onChange={toggleHearingAlerts} />
            <label className="flex items-center justify-between gap-3">
              <span className="text-xs opacity-80">Remind me ahead of a deadline</span>
              <select
                value={leadDays}
                onChange={(e) => changeLeadDays(Number(e.target.value))}
                className="shrink-0 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs outline-none focus:border-brand/60"
                aria-label="Reminder lead time"
              >
                <option value={3} className="bg-ground">3 days</option>
                <option value={7} className="bg-ground">7 days</option>
                <option value={14} className="bg-ground">14 days</option>
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
