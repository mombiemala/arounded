import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function cToF(c: number) {
  return (c * 9) / 5 + 32;
}

async function getWeatherDailyMax(lat: number, lng: number) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_max` +
    `&temperature_unit=celsius&timezone=auto`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Weather fetch failed");
  const data = await res.json();
  const maxC = data?.daily?.temperature_2m_max?.[0];
  return maxC != null ? cToF(maxC) : null;
}

async function getAirNow(lat: number, lng: number) {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=pm2_5,us_aqi` +
    `&timezone=auto`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Air fetch failed");
  const data = await res.json();
  return { pm25: data?.current?.pm2_5 ?? null, usAqi: data?.current?.us_aqi ?? null };
}

async function getSmokePresent(lat: number, lng: number) {
  // Use your cached daily smoke GeoJSON (public)
  const u = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/smoke/latest-url`, {
    cache: "no-store",
  });
  if (!u.ok) return null;
  const { url } = await u.json();

  const geoRes = await fetch(url, { cache: "no-store" });
  if (!geoRes.ok) return null;
  const geojson = await geoRes.json();

  // MVP: bbox intersection (fast). We can upgrade to true point-in-polygon next.
  const features = geojson?.features ?? [];
  for (const f of features) {
    const geom = f?.geometry;
    if (!geom) continue;

    const coords: number[][] = [];
    const pushCoords = (arr: any) => {
      if (typeof arr?.[0] === "number") coords.push(arr as number[]);
      else if (Array.isArray(arr)) arr.forEach(pushCoords);
    };
    pushCoords(geom.coordinates);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of coords) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    if (lng >= minX && lng <= maxX && lat >= minY && lat <= maxY) return true;
  }

  return false;
}

export async function GET() {
  try {
    const { data: places, error } = await supabase
      .from("saved_places")
      .select("id, lat, lng");

    if (error) throw error;

    const today = new Date().toISOString().slice(0, 10);

    for (const p of places ?? []) {
      const [tempMaxF, air, smokePresent] = await Promise.all([
        getWeatherDailyMax(p.lat, p.lng),
        getAirNow(p.lat, p.lng),
        getSmokePresent(p.lat, p.lng),
      ]);

      const { error: upErr } = await supabase
        .from("daily_conditions")
        .upsert(
          {
            place_id: p.id,
            date: today,
            temp_max_f: tempMaxF,
            pm25: air.pm25,
            us_aqi: air.usAqi,
            smoke_present: smokePresent,
          },
          { onConflict: "place_id,date" }
        );

      if (upErr) throw upErr;
    }

    return NextResponse.json({ ok: true, date: today, places: places?.length ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}