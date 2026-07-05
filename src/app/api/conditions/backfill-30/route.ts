import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function cToF(c: number) {
  return (c * 9) / 5 + 32;
}

async function getWeatherDailyMax(lat: number, lng: number, start: string, end: string) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&daily=temperature_2m_max` +
    `&start_date=${start}&end_date=${end}` +
    `&temperature_unit=celsius&timezone=auto`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

async function getAirDaily(lat: number, lng: number, start: string, end: string) {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${lat}&longitude=${lng}` +
    `&daily=pm2_5_max,us_aqi_max` +
    `&start_date=${start}&end_date=${end}` +
    `&timezone=auto`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Air fetch failed");
  return res.json();
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: places, error } = await supabase
      .from("saved_places")
      .select("id, lat, lng");

    if (error) throw error;

    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 90);
    const start = startDate.toISOString().slice(0, 10);

    for (const p of places ?? []) {
      const [w, a] = await Promise.all([
        getWeatherDailyMax(p.lat, p.lng, start, end),
        getAirDaily(p.lat, p.lng, start, end),
      ]);

      const dates: string[] = w?.daily?.time ?? [];
      const highsC: number[] = w?.daily?.temperature_2m_max ?? [];
      const pm25max: (number | null)[] = a?.daily?.pm2_5_max ?? [];
      const aqiMax: (number | null)[] = a?.daily?.us_aqi_max ?? [];

      for (let i = 0; i < dates.length; i++) {
        const tempMaxF = highsC?.[i] != null ? cToF(highsC[i]) : null;

        await supabase.from("daily_conditions").upsert(
          {
            place_id: p.id,
            date: dates[i],
            temp_max_f: tempMaxF,
            pm25: pm25max?.[i] ?? null,
            us_aqi: aqiMax?.[i] ?? null,
            // smoke_present will remain null for backfill; we’ll backfill smoke next
            smoke_present: null,
          },
          { onConflict: "place_id,date" }
        );
      }
    }

    return NextResponse.json({ ok: true, start, end, places: places?.length ?? 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}