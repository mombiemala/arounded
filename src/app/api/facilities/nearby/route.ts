import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// EPA Facility Registry Service (FRS) radial search. Public domain (US gov).
// Docs: https://www.epa.gov/frs/frs-rest-services
// Facilities are queried on demand by location rather than bulk-stored, since
// the national dataset is in the millions and FRS is designed for radial reads.
const FRS_BASE =
  "https://ofmpub.epa.gov/frs_public2/frs_rest_services.get_facilities";

const MAX_RADIUS_MILES = 25;
const MAX_RESULTS = 2000;

type FrsFacility = {
  RegistryId?: string | number;
  FacilityName?: string;
  Latitude83?: string | number | null;
  Longitude83?: string | number | null;
};

type NormalizedFacility = {
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
  const { searchParams } = new URL(request.url);
  const lat = toNumber(searchParams.get("lat"));
  const lng = toNumber(searchParams.get("lng"));
  const radius = Math.min(
    toNumber(searchParams.get("radius")) ?? 10,
    MAX_RADIUS_MILES
  );

  if (lat == null || lng == null) {
    return NextResponse.json(
      { ok: false, error: "lat and lng query params are required" },
      { status: 400 }
    );
  }

  const url =
    `${FRS_BASE}?latitude83=${lat}&longitude83=${lng}` +
    `&search_radius=${radius}&output=JSON`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`FRS request failed (${res.status})`);

    const data = await res.json();
    const raw = data?.Results?.FRSFacility ?? [];
    const list: FrsFacility[] = Array.isArray(raw) ? raw : [raw];

    const facilities: NormalizedFacility[] = list
      .map((f) => {
        const fLat = toNumber(f.Latitude83);
        const fLng = toNumber(f.Longitude83);
        if (fLat == null || fLng == null) return null;
        return {
          id: String(f.RegistryId ?? `${fLat},${fLng}`),
          name: f.FacilityName?.trim() || "EPA facility",
          lat: fLat,
          lng: fLng,
          source: "EPA FRS",
        };
      })
      .filter((f): f is NormalizedFacility => f !== null)
      .slice(0, MAX_RESULTS);

    return NextResponse.json({ ok: true, facilities });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
