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

export default function NotificationsBell() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createBrowserClient();

  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id,title,body,link,read_at,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setItems((data ?? []) as Notification[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

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
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] border border-white/10 rounded-xl bg-black/95 backdrop-blur-sm shadow-lg overflow-hidden z-50"
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
        </div>
      )}
    </div>
  );
}
