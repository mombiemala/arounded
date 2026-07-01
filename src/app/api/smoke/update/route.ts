import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// NOAA HMS Smoke Detection (ArcGIS FeatureServer layer 0)
const HMS_SMOKE_GEOJSON_URL =
  "https://services2.arcgis.com/C8EMgrsFcRFL6LrL/arcgis/rest/services/NOAA_Satellite_Smoke_Detection_(v1)/FeatureServer/0/query" +
  "?where=1%3D1" +
  "&outFields=*" +
  "&returnGeometry=true" +
  "&f=geojson";

export async function GET() {
  try {
    const res = await fetch(HMS_SMOKE_GEOJSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch NOAA HMS smoke GeoJSON");

    const geojson = await res.json();

    const supabase = getSupabase();
    const { error } = await supabase.storage
      .from("smoke-daily")
      .upload("latest.geojson", JSON.stringify(geojson), {
        contentType: "application/geo+json",
        upsert: true,
      });

    if (error) throw error;

    return NextResponse.json({ ok: true, features: geojson?.features?.length ?? 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}