"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ChangeRow = {
  id: string;
  change_type: string;
  change_date: string;
  summary: string | null;
};

const CHANGE_COLOR: Record<string, string> = {
  added: "#51cf66",
  removed: "#ff6b6b",
  imported: "#4dabf7",
  updated: "#ffa94d",
};

export default function RecentChanges() {
  const [rows, setRows] = useState<ChangeRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("changes")
      .select("id,change_type,change_date,summary")
      .order("change_date", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (!cancelled) setRows((data ?? []) as ChangeRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide entirely until there's something to show.
  if (!rows || rows.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">Recent changes</div>
        <Link href="/changes" className="text-xs underline opacity-80 hover:opacity-100">
          See all
        </Link>
      </div>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.id} className="flex gap-2 text-xs">
            <span
              className="mt-1 inline-block w-2 h-2 rounded-full shrink-0"
              style={{ background: CHANGE_COLOR[r.change_type] ?? "#ffffff" }}
            />
            <span className="opacity-80">{r.summary ?? r.change_type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
