// Shared environmental lookups used by the map and the compare page.

export type PlaceHit = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

export type Weather = {
  tempF: number | null;
  humidity: number | null;
  windMph: number | null;
  todayHighF: number | null;
  todayLowF: number | null;
};

export type Air = {
  pm25: number | null;
  usAqi: number | null;
  aod: number | null;
};

const cToF = (c: number) => (c * 9) / 5 + 32;
const msToMph = (ms: number) => ms * 2.236936;

type MapboxV6Feature = {
  id?: string;
  properties?: {
    mapbox_id?: string;
    name?: string;
    full_address?: string;
    place_formatted?: string;
  };
  geometry?: { coordinates?: [number, number] };
};

export async function geocodeForward(query: string): Promise<PlaceHit[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");

  const url =
    "https://api.mapbox.com/search/geocode/v6/forward" +
    `?q=${encodeURIComponent(query)}` +
    `&access_token=${token}&autocomplete=true&limit=5&country=us`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed");

  const data: { features?: MapboxV6Feature[] } = await res.json();
  return (data.features ?? [])
    .filter((f) => Array.isArray(f.geometry?.coordinates))
    .map((f, i) => {
      const props = f.properties ?? {};
      const name =
        props.full_address ?? props.name ?? props.place_formatted ?? "Unknown place";
      return {
        id: props.mapbox_id ?? f.id ?? `${name}-${i}`,
        place_name: name,
        center: f.geometry!.coordinates as [number, number],
      };
    });
}

export async function fetchWeather(lat: number, lng: number): Promise<Weather> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&temperature_unit=celsius&wind_speed_unit=ms&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather request failed");
  const data = await res.json();

  return {
    tempF: data?.current?.temperature_2m != null ? cToF(data.current.temperature_2m) : null,
    humidity: data?.current?.relative_humidity_2m ?? null,
    windMph: data?.current?.wind_speed_10m != null ? msToMph(data.current.wind_speed_10m) : null,
    todayHighF:
      data?.daily?.temperature_2m_max?.[0] != null ? cToF(data.daily.temperature_2m_max[0]) : null,
    todayLowF:
      data?.daily?.temperature_2m_min?.[0] != null ? cToF(data.daily.temperature_2m_min[0]) : null,
  };
}

export async function fetchAirQuality(lat: number, lng: number): Promise<Air> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}` +
    `&current=pm2_5,us_aqi,aerosol_optical_depth&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Air quality request failed");
  const data = await res.json();

  return {
    pm25: data?.current?.pm2_5 ?? null,
    usAqi: data?.current?.us_aqi ?? null,
    aod: data?.current?.aerosol_optical_depth ?? null,
  };
}

// US EPA AQI categories.
export function aqiCategory(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "#51cf66" };
  if (aqi <= 100) return { label: "Moderate", color: "#ffd43b" };
  if (aqi <= 150) return { label: "Unhealthy (sensitive)", color: "#ffa94d" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#ff6b6b" };
  if (aqi <= 300) return { label: "Very unhealthy", color: "#cc5de8" };
  return { label: "Hazardous", color: "#e64980" };
}

export function smokeLabel(air: Air | null): string {
  if (!air) return "—";
  const pm25 = air.pm25 ?? 0;
  const aod = air.aod ?? 0;
  const aqi = air.usAqi;
  if (pm25 >= 25 || aod >= 0.5 || (aqi != null && aqi >= 120)) return "Likely smoky";
  if (pm25 >= 15 || aod >= 0.3 || (aqi != null && aqi >= 80)) return "Possible smoke";
  return "No smoke signal";
}
