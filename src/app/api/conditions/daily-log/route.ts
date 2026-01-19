import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function cToF(c: number) {
  return (c * 9) / 5 + 32;
}

// Open-Meteo weather (daily max temp)
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

// Open-Meteo air quality (current pm2_5 + us_aqi)
async function getAirNow(lat: number, lng: number) {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=pm2_5,us_aqi` +
    `&timezone=auto`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Air fetch failed");
  const data = await res.json();

  return {
    pm25: data?.current?.pm2_5 ?? null,
    usAqi: data?.current?.us_aqi ?? null,
  };
}

// Smoke present today: check if today’s smoke GeoJSON intersects a point
async function getSmokePresent(lat: number, lng: number) {
  // Pull your cached NOAA smoke GeoJSON from Supabase public URL via your API
  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/smoke/latest-url`, {
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok) return null;

  const { url } = await res.json();
  const geoRes = await fetch(url, { cache: "no-store" });
  if (!geoRes.ok) return null;

  const geojson = await geoRes.json();

  // Lightweight point-in-polygon check using bbox first to avoid heavy compute
  // For MVP: treat any polygon bbox containing the point as “present”.
  // We’ll improve this to true point-in-polygon later.
  const features = geojson?.features ?? [];
  for (const f of features) {
    const geom = f?.geometry;
    if (!geom) continue;

    // compute rough bbox from coordinates (handles Polygon/MultiPolygon)
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

    if (lng >= minX && lng <= maxX && lat >= minY && lat <= maxY) {
      return true;
    }
  }

  return false;
}

export async function GET() {
  try {
    // Grab all saved places
    const { data: places, error: placesErr } = await supabase
      .from("saved_places")
      .select("id, lat, lng");

    if (placesErr) throw placesErr;

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

    for (const p of places ?? []) {
      const [tempMaxF, air, smokePresent] = await Promise.all([
        getWeatherDailyMax(p.lat, p.lng),
        getAirNow(p.lat, p.lng),
        getSmokePresent(p.lat, p.lng),
      ]);

      await supabase
        .from("daily_conditions")
        .upsert(
          {
            place_id: p.id,
            date: dateStr,
            temp_max_f: tempMaxF,
            pm25: air.pm25,
            us_aqi: air.usAqi,
            smoke_present: smokePresent,
          },
          { onConflict: "place_id,date" }
        );
    }

    return NextResponse.json({ ok: true, date: dateStr, places: places?.length ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}