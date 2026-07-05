import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// FracTracker U.S. Data Centers Tracker — an open, facility-level dataset of
// proposed, under-construction, and operating data centers, with operator,
// energy demand, cooling, and community-opposition detail.
// Non-commercial use with credit to FracTracker Alliance.
// https://www.fractracker.org/data-centers/
const FT_BASE =
  "https://services.arcgis.com/jDGuO8tYggdCCnUJ/arcgis/rest/services/data_centers_v4_agol_all/FeatureServer/0/query";
const FT_FIELDS =
  "facility_id,facility_name,city,state,status,operator_name,mw,cooling_type,facility_size_sqft,community_pushback";
const PAGE = 1000;
const SOURCE = "FracTracker";

const STATUS_MAP: Record<string, string> = {
  Operating: "operational",
  Proposed: "proposed",
  "Approved/Permitted/Under construction": "construction",
  Expanding: "expanding",
  Cancelled: "cancelled",
};

type FtProps = {
  facility_id?: string | null;
  facility_name?: string | null;
  city?: string | null;
  state?: string | null;
  status?: string | null;
  operator_name?: string | null;
  mw?: string | null;
  cooling_type?: string | null;
  facility_size_sqft?: number | null;
  community_pushback?: string | null;
};

type FtFeature = {
  properties?: FtProps;
  geometry?: { coordinates?: [number, number] } | null;
};

type DataCenterRow = {
  name: string;
  lat: number;
  lng: number;
  status: string;
  source: string;
  source_id: string;
  notes: string | null;
  last_seen: string;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function buildNotes(p: FtProps): string | null {
  const parts: string[] = [];
  const op = p.operator_name?.trim();
  if (op) parts.push(op);
  const mw = p.mw?.trim();
  if (mw && /^[0-9]/.test(mw)) parts.push(`${mw} MW`);
  const cooling = p.cooling_type?.trim();
  if (cooling) parts.push(cooling);
  if (p.facility_size_sqft != null) parts.push(`${Math.round(p.facility_size_sqft).toLocaleString()} sq ft`);
  if (p.community_pushback === "Yes") parts.push("Community opposition reported");
  return parts.length ? parts.join(" • ") : null;
}

async function fetchPage(offset: number): Promise<FtFeature[]> {
  const url =
    `${FT_BASE}?where=1%3D1&outFields=${encodeURIComponent(FT_FIELDS)}` +
    `&f=geojson&resultRecordCount=${PAGE}&resultOffset=${offset}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`FracTracker request failed (${res.status})`);
  const body: { features?: FtFeature[] } = await res.json();
  return body.features ?? [];
}

export async function GET() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Page through the tracker until a short page signals the end.
    const features: FtFeature[] = [];
    for (let offset = 0; offset < 10000; offset += PAGE) {
      const page = await fetchPage(offset);
      features.push(...page);
      if (page.length < PAGE) break;
    }

    const seen = new Set<string>();
    const rows: DataCenterRow[] = [];
    for (const f of features) {
      const coords = f.geometry?.coordinates;
      const p = f.properties ?? {};
      if (!Array.isArray(coords)) continue;
      const [lng, lat] = coords;
      if (typeof lat !== "number" || typeof lng !== "number" || (lat === 0 && lng === 0)) continue;

      const sourceId = p.facility_id?.trim() || `ft-${p.facility_name ?? ""}-${lat},${lng}`;
      if (seen.has(sourceId)) continue;
      seen.add(sourceId);

      const place = [p.city?.trim(), p.state?.trim()].filter(Boolean).join(", ");
      const name = p.facility_name?.trim() || "Data center";
      rows.push({
        name: place ? `${name} (${place})` : name,
        lat,
        lng,
        status: STATUS_MAP[p.status ?? ""] ?? "other",
        source: SOURCE,
        source_id: sourceId,
        notes: buildNotes(p),
        last_seen: today,
      });
    }

    const supabase = getSupabase();

    let upserted = 0;
    for (const batch of chunk(rows, 500)) {
      const { error } = await supabase
        .from("data_centers")
        .upsert(batch, { onConflict: "source,source_id" });
      if (error) throw error;
      upserted += batch.length;
    }

    // Prune rows that dropped out of the feed (still carry an older last_seen).
    let pruned = 0;
    if (rows.length > 0) {
      const { error, count } = await supabase
        .from("data_centers")
        .delete({ count: "exact" })
        .eq("source", SOURCE)
        .neq("last_seen", today);
      if (error) throw error;
      pruned = count ?? 0;
    }

    return NextResponse.json({ ok: true, source: SOURCE, fetched: features.length, upserted, pruned });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
