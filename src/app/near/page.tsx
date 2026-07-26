"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navigation from "@/src/components/Navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  geocodeForward,
  fetchAirQuality,
  aqiCategory,
  type PlaceHit,
  type Air,
} from "@/lib/conditions";
import {
  eventTarget,
  formatEventDate,
  countdownLabel,
  daysUntil,
  EVENT_TYPE_LABEL,
  type CivicEvent,
} from "@/lib/civicEvents";

const RADIUS_MI = 15;

const STATUS = {
  proposed: { label: "Proposed", color: "#ecab3f" },
  construction: { label: "Under construction", color: "#cf7d4a" },
  expanding: { label: "Under construction", color: "#cf7d4a" },
  operational: { label: "Operating", color: "#b7a582" },
  cancelled: { label: "Cancelled", color: "#7c766c" },
} as const;

type DCounts = { total: number; proposed: number; construction: number; operating: number };

async function dataCentersNear(lat: number, lng: number): Promise<DCounts | null> {
  const latD = RADIUS_MI / 69;
  const lngD = RADIUS_MI / (69 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  const { data, error } = await supabase
    .from("data_centers")
    .select("status")
    .gte("lat", lat - latD)
    .lte("lat", lat + latD)
    .gte("lng", lng - lngD)
    .lte("lng", lng + lngD);
  if (error || !data) return null;
  const c: DCounts = { total: data.length, proposed: 0, construction: 0, operating: 0 };
  for (const r of data as { status: string }[]) {
    if (r.status === "proposed") c.proposed++;
    else if (r.status === "construction" || r.status === "expanding") c.construction++;
    else if (r.status === "operational") c.operating++;
  }
  return c;
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
  return { id: `url-${lat},${lng}`, place_name: name ? decodeURIComponent(name) : `${lat.toFixed(3)}, ${lng.toFixed(3)}`, center: [lng, lat] };
}

function Search({ onSelect }: { onSelect: (p: PlaceHit) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceHit[]>([]);
  useEffect(() => {
    const q = query.trim();
    const t = setTimeout(async () => {
      if (q.length < 3) {
        setResults([]);
        return;
      }
      try {
        setResults(await geocodeForward(q));
      } catch {
        setResults([]);
      }
    }, q.length < 3 ? 0 : 250);
    return () => clearTimeout(t);
  }, [query]);
  return (
    <div className="relative max-w-md">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && results[0] && onSelect(results[0])}
        placeholder="Enter an address, city, or ZIP"
        aria-label="Address"
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/40 focus:border-brand/60 transition-colors"
      />
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-white/10 overflow-hidden bg-ground shadow-lg">
          {results.slice(0, 5).map((r) => (
            <button key={r.id} onClick={() => onSelect(r)} className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 border-b border-white/5 last:border-b-0">
              {r.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NearInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [place, setPlace] = useState<PlaceHit | null>(() => decodePlace(params.get("a")));
  const [dc, setDc] = useState<DCounts | null>(null);
  const [air, setAir] = useState<Air | null>(null);
  const [events, setEvents] = useState<CivicEvent[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const placeKey = place ? `${place.center[0]},${place.center[1]}` : null;
  const loading = placeKey != null && loadedKey !== placeKey;

  const select = (p: PlaceHit) => {
    setPlace(p);
    router.replace(`/near?a=${encodePlace(p)}`, { scroll: false });
  };

  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    const [lng, lat] = place.center;
    (async () => {
      const [d, a, evRes] = await Promise.all([
        dataCentersNear(lat, lng),
        fetchAirQuality(lat, lng).catch(() => null),
        fetch(`/api/civic-events/nearby?lat=${lat}&lng=${lng}&radius=25`).then((r) => r.json()).catch(() => ({ events: [] })),
      ]);
      if (cancelled) return;
      setDc(d);
      setAir(a);
      const up = ((evRes.events ?? []) as CivicEvent[])
        .filter((e) => (daysUntil(eventTarget(e)) ?? 0) >= 0)
        .sort((x, y) => new Date(eventTarget(x) ?? 0).getTime() - new Date(eventTarget(y) ?? 0).getTime())
        .slice(0, 3);
      setEvents(up);
      setLoadedKey(`${lng},${lat}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [place]);

  const aqi = useMemo(() => (air?.usAqi != null ? aqiCategory(air.usAqi) : null), [air]);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-brand mb-3">
          What&apos;s around this address
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          The facts around a place — not a risk score
        </h1>
        <p className="opacity-75 leading-relaxed mb-8 max-w-xl">
          What&apos;s physically near an address and what&apos;s <em>proposed</em> next door — data centers,
          facilities, air — every layer sourced. Share it with a neighbor, an agent, or your group.
        </p>

        {!place ? (
          <Search onSelect={select} />
        ) : (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {/* Card header */}
            <div className="p-6 border-b border-white/10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-semibold truncate">{place.place_name}</div>
                <div className="text-xs opacity-55 mt-1">Within {RADIUS_MI} miles · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              <button onClick={share} className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-white/20 hover:border-brand/50 hover:text-brand transition-colors">
                {copied ? "Copied!" : "Share"}
              </button>
            </div>

            {loading ? (
              <div className="p-6 text-sm opacity-60">Gathering what&apos;s nearby…</div>
            ) : (
              <div className="divide-y divide-white/10">
                {/* Data centers — proposed emphasized */}
                <div className="p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand/80 mb-3">Data centers nearby</div>
                  {dc == null ? (
                    <div className="text-sm opacity-55">Couldn&apos;t load right now.</div>
                  ) : dc.total === 0 ? (
                    <div className="text-sm opacity-70">None tracked within {RADIUS_MI} miles.</div>
                  ) : (
                    <div className="flex flex-wrap gap-x-8 gap-y-3">
                      <div>
                        <div className="text-3xl font-bold tabular-nums" style={{ color: STATUS.proposed.color }}>{dc.proposed}</div>
                        <div className="text-xs opacity-70 mt-0.5">Proposed <span className="opacity-50">(could still be stopped)</span></div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold tabular-nums" style={{ color: STATUS.construction.color }}>{dc.construction}</div>
                        <div className="text-xs opacity-70 mt-0.5">Under construction</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold tabular-nums" style={{ color: STATUS.operational.color }}>{dc.operating}</div>
                        <div className="text-xs opacity-70 mt-0.5">Operating</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upcoming decisions */}
                {events.length > 0 && (
                  <div className="p-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand/80 mb-3">Upcoming decisions</div>
                    <ul className="space-y-2.5">
                      {events.map((e) => {
                        const t = eventTarget(e);
                        return (
                          <li key={e.id} className="text-sm">
                            <span className="font-medium">{e.title}</span>
                            <span className="opacity-60"> · {EVENT_TYPE_LABEL[e.event_type] ?? e.event_type} · {formatEventDate(t)}{countdownLabel(t) ? ` (${countdownLabel(t)})` : ""}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Air */}
                <div className="p-6">
                  <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand/80 mb-3">Air quality now</div>
                  {aqi ? (
                    <div className="flex items-center gap-2.5 text-sm">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ background: aqi.color }} />
                      <span className="font-semibold">AQI {Math.round(air!.usAqi!)}</span>
                      <span className="opacity-60">{aqi.label}</span>
                    </div>
                  ) : (
                    <div className="text-sm opacity-55">Not available right now.</div>
                  )}
                </div>

                {/* Sources / CTA */}
                <div className="p-6 bg-brand/[0.04]">
                  <p className="text-xs opacity-60 leading-relaxed">
                    Sources: data centers via <a href="https://www.fractracker.org/data-centers/" target="_blank" rel="noopener noreferrer" className="text-brand/90 hover:text-brand">FracTracker</a>,
                    air via <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="text-brand/90 hover:text-brand">Open-Meteo</a>,
                    hearings community- and admin-sourced. Not a predictive risk score — the actual, named facts around this address.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Link href={`/map?lat=${place.center[1]}&lng=${place.center[0]}`} className="px-4 py-2 rounded-lg bg-brand text-brand-ink text-sm font-medium hover:bg-brand-strong transition-colors">
                      Explore on the map
                    </Link>
                    <button onClick={() => { setPlace(null); router.replace("/near", { scroll: false }); }} className="px-4 py-2 rounded-lg border border-white/20 text-sm hover:border-white/40 transition-colors">
                      Check another address
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function NearPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ground" />}>
      <NearInner />
    </Suspense>
  );
}
