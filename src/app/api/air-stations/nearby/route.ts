import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// OpenAQ v3 air-quality monitoring locations, queried on demand by location.
// Requires a free API key in OPENAQ_API_KEY (https://docs.openaq.org/using-the-api/api-key).
const OPENAQ_URL = "https://api.openaq.org/v3/locations";

const MAX_RADIUS_METERS = 25000; // OpenAQ hard limit
const MILES_TO_METERS = 1609.344;

type OpenAqLocation = {
  id: number;
  name?: string;
  coordinates?: { latitude?: number | null; longitude?: number | null };
  provider?: { name?: string } | null;
};

type NormalizedStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  source: string;
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const apiKey = process.env.OPENAQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "OpenAQ air-quality stations are not configured (missing OPENAQ_API_KEY)." },
      { status: 501 }
    );
  }

  const { searchParams } = new URL(request.url);
  const lat = toNumber(searchParams.get("lat"));
  const lng = toNumber(searchParams.get("lng"));
  const radiusMiles = toNumber(searchParams.get("radius")) ?? 10;

  if (lat == null || lng == null) {
    return NextResponse.json(
      { ok: false, error: "lat and lng query params are required" },
      { status: 400 }
    );
  }

  const meters = Math.min(Math.round(radiusMiles * MILES_TO_METERS), MAX_RADIUS_METERS);
  const url =
    `${OPENAQ_URL}?coordinates=${lat},${lng}` +
    `&radius=${meters}&limit=1000`;

  try {
    const res = await fetch(url, {
      headers: { "X-API-Key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`OpenAQ request failed (${res.status})`);

    const data: { results?: OpenAqLocation[] } = await res.json();
    const results = data.results ?? [];

    const stations: NormalizedStation[] = results
      .map((loc) => {
        const sLat = toNumber(loc.coordinates?.latitude);
        const sLng = toNumber(loc.coordinates?.longitude);
        if (sLat == null || sLng == null) return null;
        return {
          id: String(loc.id),
          name: loc.name?.trim() || "Monitoring station",
          lat: sLat,
          lng: sLng,
          source: loc.provider?.name ? `OpenAQ · ${loc.provider.name}` : "OpenAQ",
        };
      })
      .filter((s): s is NormalizedStation => s !== null);

    return NextResponse.json({ ok: true, stations });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
