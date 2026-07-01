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

    // Full refresh of this source only — never touches rows from other sources
    // (e.g. manually curated entries, which use a different `source`).
    const { error: deleteError } = await supabase
      .from("data_centers")
      .delete()
      .eq("source", SOURCE);
    if (deleteError) throw deleteError;

    let inserted = 0;
    for (const batch of chunk(rows, 500)) {
      const { error: insertError } = await supabase
        .from("data_centers")
        .insert(batch);
      if (insertError) throw insertError;
      inserted += batch.length;
    }

    return NextResponse.json({
      ok: true,
      source: SOURCE,
      fetched: facilities.length,
      inserted,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
