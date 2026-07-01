import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// PeeringDB facility ("fac") records: colocation / interconnection facilities
// with coordinates. Open data, no auth required for facility records.
// Docs: https://docs.peeringdb.com/api_specs/
const PEERINGDB_FAC_URL = "https://www.peeringdb.com/api/fac?country=US";

const SOURCE = "PeeringDB";

type PeeringDbFacility = {
  id: number;
  name?: string;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type DataCenterRow = {
  name: string;
  lat: number;
  lng: number;
  status: string;
  source: string;
  source_id: string;
  last_seen: string;
};

// first_seen is intentionally omitted from upserts: the column defaults to
// CURRENT_DATE on insert and is preserved (not in the update SET) on conflict.

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function GET() {
  try {
    const res = await fetch(PEERINGDB_FAC_URL, {
      cache: "no-store",
      // PeeringDB asks API clients to identify themselves.
      headers: { "User-Agent": "arounded/1.0 (+https://arounded.app)" },
    });
    if (!res.ok) throw new Error(`PeeringDB request failed (${res.status})`);

    const body: { data?: PeeringDbFacility[] } = await res.json();
    const facilities = body.data ?? [];
    const today = new Date().toISOString().slice(0, 10);

    const rows: DataCenterRow[] = facilities
      .filter(
        (f) =>
          typeof f.latitude === "number" &&
          typeof f.longitude === "number" &&
          !Number.isNaN(f.latitude) &&
          !Number.isNaN(f.longitude)
      )
      .map((f) => {
        const place = [f.city, f.state].filter(Boolean).join(", ");
        const name = f.name?.trim() || "Data center";
        return {
          name: place ? `${name} (${place})` : name,
          lat: f.latitude as number,
          lng: f.longitude as number,
          status: "operational",
          source: SOURCE,
          source_id: String(f.id),
          last_seen: today,
        };
      });

    const supabase = getSupabase();

    // Idempotent upsert keyed on (source, source_id) — inserts new facilities,
    // updates moved/renamed ones, and preserves first_seen history. Only ever
    // touches rows with source = 'PeeringDB', never manually curated entries.
    let upserted = 0;
    for (const batch of chunk(rows, 500)) {
      const { error: upsertError } = await supabase
        .from("data_centers")
        .upsert(batch, { onConflict: "source,source_id" });
      if (upsertError) throw upsertError;
      upserted += batch.length;
    }

    // Drop facilities that have disappeared from the feed for this source.
    const currentIds = rows.map((r) => r.source_id);
    if (currentIds.length > 0) {
      const { error: pruneError } = await supabase
        .from("data_centers")
        .delete()
        .eq("source", SOURCE)
        .not("source_id", "in", `(${currentIds.join(",")})`);
      if (pruneError) throw pruneError;
    }

    return NextResponse.json({
      ok: true,
      source: SOURCE,
      fetched: facilities.length,
      upserted,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
