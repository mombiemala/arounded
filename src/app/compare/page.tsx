"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navigation from "@/src/components/Navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  geocodeForward,
  fetchWeather,
  fetchAirQuality,
  aqiCategory,
  smokeLabel,
  type PlaceHit,
  type Weather,
  type Air,
} from "@/lib/conditions";

type PlaceData = {
  place: PlaceHit;
  weather: Weather | null;
  air: Air | null;
  dataCenters: number | null;
};

const COMPARE_RADIUS_MI = 25;

async function countDataCenters(lat: number, lng: number): Promise<number | null> {
  const latDelta = COMPARE_RADIUS_MI / 69;
  const lngDelta = COMPARE_RADIUS_MI / (69 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const { count, error } = await supabase
    .from("data_centers")
    .select("id", { count: "exact", head: true })
    .gte("lat", lat - latDelta)
    .lte("lat", lat + latDelta)
    .gte("lng", lng - lngDelta)
    .lte("lng", lng + lngDelta);
  return error ? null : count ?? 0;
}

function encodePlace(p: PlaceHit): string {
  return `${p.center[1].toFixed(4)},${p.center[0].toFixed(4)},${encodeURIComponent(p.place_name)}`;
}

function decodePlace(v: string | null): PlaceHit | null {
  if (!v) return null;
  const parts = v.split(",");
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  const name = parts.slice(2).join(",");
  return {
    id: `url-${lat},${lng}`,
    place_name: name ? decodeURIComponent(name) : `${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    center: [lng, lat],
  };
}

function SearchSlot({
  label,
  place,
  onSelect,
  onClear,
}: {
  label: string;
  place: PlaceHit | null;
  onSelect: (p: PlaceHit) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceHit[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setSearching(true);
        setResults(await geocodeForward(query.trim()));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  if (place) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2">
        <div className="text-sm truncate">{place.place_name}</div>
        <button
          onClick={() => {
            onClear();
            setQuery("");
          }}
          className="text-xs opacity-60 hover:opacity-100 shrink-0"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length > 0) {
            e.preventDefault();
            onSelect(results[0]);
          }
        }}
        placeholder={`${label} — address, city, ZIP`}
        aria-label={`${label} location`}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-white/40 focus:border-white/40 transition-colors"
      />
      {searching && <div className="text-xs opacity-60 px-1">Searching…</div>}
      {results.length > 0 && (
        <div className="rounded-lg border border-white/10 overflow-hidden bg-white/5">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r);
                setQuery("");
                setResults([]);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 border-b border-white/5 last:border-b-0 transition-colors"
            >
              {r.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  a,
  b,
}: {
  label: string;
  a: React.ReactNode;
  b: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center py-3 border-b border-white/10 last:border-b-0">
      <div className="text-sm text-right">{a}</div>
      <div className="text-[11px] uppercase tracking-wide opacity-50 text-center px-2 min-w-[84px]">
        {label}
      </div>
      <div className="text-sm">{b}</div>
    </div>
  );
}

function aqiNode(air: Air | null): React.ReactNode {
  if (air?.usAqi == null) return <span className="opacity-50">—</span>;
  const cat = aqiCategory(air.usAqi);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
      {Math.round(air.usAqi)}
      <span className="opacity-60 text-xs">{cat.label}</span>
    </span>
  );
}

function CompareInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from the URL once (so a shared /compare?a=…&b=… link restores).
  const [placeA, setPlaceA] = useState<PlaceHit | null>(() =>
    decodePlace(searchParams.get("a"))
  );
  const [placeB, setPlaceB] = useState<PlaceHit | null>(() =>
    decodePlace(searchParams.get("b"))
  );
  const [dataA, setDataA] = useState<PlaceData | null>(null);
  const [dataB, setDataB] = useState<PlaceData | null>(null);
  const firstSyncRef = useRef(true);

  // Keep the URL in sync so a comparison is shareable (skip the initial render).
  useEffect(() => {
    if (firstSyncRef.current) {
      firstSyncRef.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (placeA) params.set("a", encodePlace(placeA));
    if (placeB) params.set("b", encodePlace(placeB));
    router.replace(`/compare${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }, [placeA, placeB, router]);

  useEffect(() => {
    let cancelled = false;
    const load = async (place: PlaceHit | null, set: (d: PlaceData | null) => void) => {
      if (!place) {
        set(null);
        return;
      }
      const [lng, lat] = place.center;
      const [weather, air, dataCenters] = await Promise.all([
        fetchWeather(lat, lng).catch(() => null),
        fetchAirQuality(lat, lng).catch(() => null),
        countDataCenters(lat, lng),
      ]);
      if (!cancelled) set({ place, weather, air, dataCenters });
    };
    load(placeA, setDataA);
    load(placeB, setDataB);
    return () => {
      cancelled = true;
    };
  }, [placeA, placeB]);

  const bothChosen = placeA && placeB;

  const num = (v: number | null | undefined, suffix = "") =>
    v == null ? <span className="opacity-50">—</span> : `${Math.round(v)}${suffix}`;

  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-2">Compare two places</h1>
        <p className="opacity-80 leading-relaxed mb-8 max-w-2xl">
          Put two neighborhoods side by side — current conditions, air quality, and how many
          data centers are within {COMPARE_RADIUS_MI} miles. Share the link to compare with
          someone else.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <SearchSlot
            label="Place A"
            place={placeA}
            onSelect={setPlaceA}
            onClear={() => setPlaceA(null)}
          />
          <SearchSlot
            label="Place B"
            place={placeB}
            onSelect={setPlaceB}
            onClear={() => setPlaceB(null)}
          />
        </div>

        {!bothChosen ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm opacity-80">
            Choose two places above to compare them.
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end pb-3 mb-1 border-b border-white/10">
              <div className="text-right font-semibold truncate">{placeA?.place_name}</div>
              <div className="text-[11px] uppercase tracking-wide opacity-50 text-center min-w-[84px]">
                vs
              </div>
              <div className="font-semibold truncate">{placeB?.place_name}</div>
            </div>

            <Metric
              label="Data centers ≤25mi"
              a={
                dataA?.dataCenters != null ? (
                  <span className="font-semibold">{dataA.dataCenters}</span>
                ) : (
                  <span className="opacity-50">…</span>
                )
              }
              b={
                dataB?.dataCenters != null ? (
                  <span className="font-semibold">{dataB.dataCenters}</span>
                ) : (
                  <span className="opacity-50">…</span>
                )
              }
            />
            <Metric label="Air quality" a={aqiNode(dataA?.air ?? null)} b={aqiNode(dataB?.air ?? null)} />
            <Metric
              label="Smoke"
              a={smokeLabel(dataA?.air ?? null)}
              b={smokeLabel(dataB?.air ?? null)}
            />
            <Metric
              label="Temp"
              a={num(dataA?.weather?.tempF, "°F")}
              b={num(dataB?.weather?.tempF, "°F")}
            />
            <Metric
              label="Today H / L"
              a={
                dataA?.weather?.todayHighF != null
                  ? `${Math.round(dataA.weather.todayHighF)}° / ${Math.round(dataA.weather.todayLowF ?? 0)}°`
                  : "—"
              }
              b={
                dataB?.weather?.todayHighF != null
                  ? `${Math.round(dataB.weather.todayHighF)}° / ${Math.round(dataB.weather.todayLowF ?? 0)}°`
                  : "—"
              }
            />
            <Metric
              label="Humidity"
              a={num(dataA?.weather?.humidity, "%")}
              b={num(dataB?.weather?.humidity, "%")}
            />
            <Metric
              label="Wind"
              a={num(dataA?.weather?.windMph, " mph")}
              b={num(dataB?.weather?.windMph, " mph")}
            />

            <p className="text-xs opacity-50 mt-4">
              Current conditions are modeled estimates (Open-Meteo). For urgent decisions, use
              official local alerts.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ground" />}>
      <CompareInner />
    </Suspense>
  );
}
