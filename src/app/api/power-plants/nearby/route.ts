import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// OpenStreetMap power plants via the Overpass API. Data is ODbL-licensed
// (attribution + share-alike). Queried on demand by location.
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const MAX_RADIUS_MILES = 25;
const MILES_TO_METERS = 1609.344;
const MAX_RESULTS = 500;

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type NormalizedPlant = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  source: string;
  fuel: string | null;
  capacity: string | null;
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = toNumber(searchParams.get("lat"));
  const lng = toNumber(searchParams.get("lng"));
  const radiusMiles = Math.min(
    toNumber(searchParams.get("radius")) ?? 10,
    MAX_RADIUS_MILES
  );

  if (lat == null || lng == null) {
    return NextResponse.json(
      { ok: false, error: "lat and lng query params are required" },
      { status: 400 }
    );
  }

  const meters = Math.round(radiusMiles * MILES_TO_METERS);
  const query =
    `[out:json][timeout:25];` +
    `nwr[power=plant](around:${meters},${lat},${lng});` +
    `out center ${MAX_RESULTS};`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Overpass request failed (${res.status})`);

    const data: { elements?: OverpassElement[] } = await res.json();
    const elements = data.elements ?? [];

    const plants: NormalizedPlant[] = elements
      .map((el): NormalizedPlant | null => {
        const elLat = el.lat ?? el.center?.lat ?? null;
        const elLng = el.lon ?? el.center?.lon ?? null;
        if (elLat == null || elLng == null) return null;
        const tags = el.tags ?? {};
        return {
          id: `${el.type}/${el.id}`,
          name: tags.name?.trim() || "Power plant",
          lat: elLat,
          lng: elLng,
          source: "OpenStreetMap",
          fuel: tags["plant:source"] ?? tags["generator:source"] ?? null,
          capacity: tags["plant:output:electricity"] ?? null,
        };
      })
      .filter((p): p is NormalizedPlant => p !== null);

    return NextResponse.json({ ok: true, plants });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
