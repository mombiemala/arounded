"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

type GeocodeFeature = {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
};

const DEFAULT_CENTER: [number, number] = [-77.5636, 39.1157]; // Leesburg-ish
const DEFAULT_ZOOM = 9;

const RADIUS_OPTIONS_MILES = [1, 3, 10, 25] as const;

function milesToKm(miles: number) {
  return miles * 1.609344;
}

async function geocode(query: string): Promise<GeocodeFeature[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");

  const url =
    "https://api.mapbox.com/geocoding/v5/mapbox.places/" +
    encodeURIComponent(query) +
    `.json?access_token=${token}&autocomplete=true&limit=5&country=US`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Geocoding request failed");

  const data = await res.json();
  return (data.features ?? []).map((f: any) => ({
    id: f.id,
    place_name: f.place_name,
    center: f.center,
  }));
}
import { supabase } from "@/lib/supabaseClient";

type PointItem = {
  id: string;
  name: string;
  status?: string | null;
  lat: number;
  lng: number;
  source?: string | null;
};

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeFeature[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedPlace, setSelectedPlace] = useState<GeocodeFeature | null>(
    null
  );
  const [radiusMiles, setRadiusMiles] = useState<(typeof RADIUS_OPTIONS_MILES)[number]>(
    10
  );

  const [showDataCenters, setShowDataCenters] = useState(true);
  const [showEpaFacilities, setShowEpaFacilities] = useState(false);
  const [showSmoke, setShowSmoke] = useState(true);

  const [dataCenters, setDataCenters] = useState<PointItem[]>([]);
  const [epaFacilities, setEpaFacilities] = useState<PointItem[]>([]);
  const [layerError, setLayerError] = useState<string | null>(null);

  const [weather, setWeather] = useState<{
    tempF: number | null;
    humidity: number | null;
    windMph: number | null;
    todayHighF: number | null;
    todayLowF: number | null;
  } | null>(null);

  const [air, setAir] = useState<{
    pm25: number | null;
    pm10: number | null;
    usAqi: number | null;
    aod: number | null;
    dust: number | null;
  } | null>(null);

  const [conditionsError, setConditionsError] = useState<string | null>(null);
  const [conditionsLoading, setConditionsLoading] = useState(false);

  const center = useMemo<[number, number]>(() => {
    return selectedPlace?.center ?? DEFAULT_CENTER;
  }, [selectedPlace]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    });

    mapRef.current = map;

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    map.on("load", () => {
      // Radius source + layer
      map.addSource("radius", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: {
          "fill-opacity": 0.12,
        },
      });

      map.addLayer({
        id: "radius-outline",
        type: "line",
        source: "radius",
        paint: {
          "line-width": 2,
          "line-opacity": 0.6,
        },
      });

      // Center marker source + layer
      map.addSource("center-point", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "center-point-circle",
        type: "circle",
        source: "center-point",
        paint: {
          "circle-radius": 6,
          "circle-stroke-width": 2,
          "circle-opacity": 0.95,
        },
      });

      // Data centers source + layer
      map.addSource("data-centers", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "data-centers-layer",
        type: "circle",
        source: "data-centers",
        paint: {
          "circle-radius": 6,
          "circle-color": "#ff6b6b",
          "circle-stroke-color": "#000",
          "circle-stroke-width": 1,
          "circle-opacity": 0.9,
        },
      });

      // EPA facilities source + layer
      map.addSource("epa-facilities", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "epa-facilities-layer",
        type: "circle",
        source: "epa-facilities",
        paint: {
          "circle-radius": 5,
          "circle-color": "#4dabf7",
          "circle-stroke-color": "#000",
          "circle-stroke-width": 1,
          "circle-opacity": 0.85,
        },
      });

      // Start with EPA hidden (toggle controls visibility)
      map.setLayoutProperty("epa-facilities-layer", "visibility", "none");

      map.on("click", "data-centers-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props: any = f.properties ?? {};
        const coords = (f.geometry as any).coordinates;

        new mapboxgl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(
            `
    <div style="
      font-size:13px;
      color:#fff;
      background:#111;
      padding:8px 10px;
      border-radius:6px;
      max-width:220px;
    ">
      <div style="font-weight:600; margin-bottom:4px;">
        ${props.name ?? "Data Center"}
      </div>
      <div style="opacity:.85;">
        Status: ${props.status ?? "unknown"}
      </div>
      <div style="opacity:.6; font-size:11px; margin-top:4px;">
        Source: ${props.source ?? "—"}
      </div>
    </div>
    `
          )
          .addTo(map);
      });

      map.on("click", "epa-facilities-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props: any = f.properties ?? {};
        const coords = (f.geometry as any).coordinates;

        new mapboxgl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(
            `
    <div style="
      font-size:13px;
      color:#fff;
      background:#111;
      padding:8px 10px;
      border-radius:6px;
      max-width:220px;
    ">
      <div style="font-weight:600; margin-bottom:4px;">
        ${props.name ?? "EPA Facility"}
      </div>
      <div style="opacity:.6; font-size:11px;">
        Source: ${props.source ?? "—"}
      </div>
    </div>
    `
          )
          .addTo(map);
      });

      map.on("mouseenter", "data-centers-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "data-centers-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mouseenter", "epa-facilities-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "epa-facilities-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      // Smoke (daily) source starts empty; we'll set its data after we fetch the URL
      map.addSource("smoke-daily", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "smoke-daily-layer",
        type: "fill",
        source: "smoke-daily",
        paint: {
          "fill-opacity": 0.25,
          "fill-color": [
            "match",
            ["get", "Density"],
            "Heavy",
            "#ff6b6b",
            "Medium",
            "#ffa94d",
            "Light",
            "#ffd43b",
            "#ffd43b",
          ],
        },
      });

      // hidden by default
      map.setLayoutProperty("smoke-daily-layer", "visibility", "none");

      // Draw initial radius on default center
      drawRadiusAndCenter(DEFAULT_CENTER, radiusMiles);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whenever center or radius changes, update map visuals
  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapRef.current.isStyleLoaded()) return;

    drawRadiusAndCenter(center, radiusMiles);
    mapRef.current.easeTo({ center, zoom: Math.max(mapRef.current.getZoom(), 10) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, radiusMiles]);

  useEffect(() => {
    if (!mapRef.current) return;
    fetchLayersWithinRadius(center, radiusMiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, radiusMiles, showDataCenters, showEpaFacilities]);

  useEffect(() => {
    const run = async () => {
      try {
        setConditionsLoading(true);
        setConditionsError(null);

        const lat = center[1];
        const lng = center[0];

        const [w, a] = await Promise.all([fetchWeather(lat, lng), fetchAirQuality(lat, lng)]);
        setWeather(w);
        setAir(a);
      } catch (e: any) {
        setConditionsError(e?.message ?? "Failed to load conditions");
        setWeather(null);
        setAir(null);
      } finally {
        setConditionsLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("data-centers") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: dataCenters.map((d) => ({
        type: "Feature",
        properties: { id: d.id, name: d.name, status: d.status ?? "unknown", source: d.source ?? "" },
        geometry: { type: "Point", coordinates: [d.lng, d.lat] },
      })),
    } as any);

    map.setLayoutProperty(
      "data-centers-layer",
      "visibility",
      showDataCenters ? "visible" : "none"
    );
  }, [dataCenters, showDataCenters]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("epa-facilities") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: epaFacilities.map((d) => ({
        type: "Feature",
        properties: { id: d.id, name: d.name, source: d.source ?? "" },
        geometry: { type: "Point", coordinates: [d.lng, d.lat] },
      })),
    } as any);

    map.setLayoutProperty(
      "epa-facilities-layer",
      "visibility",
      showEpaFacilities ? "visible" : "none"
    );
  }, [epaFacilities, showEpaFacilities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    map.setLayoutProperty(
      "smoke-daily-layer",
      "visibility",
      showSmoke ? "visible" : "none"
    );
  }, [showSmoke]);

  function drawRadiusAndCenter(centerLngLat: [number, number], miles: number) {
    const map = mapRef.current;
    if (!map) return;

    const circle = turf.circle(centerLngLat, milesToKm(miles), {
      steps: 80,
      units: "kilometers",
    });

    const radiusSource = map.getSource("radius") as mapboxgl.GeoJSONSource | undefined;
    if (radiusSource) {
      radiusSource.setData(circle as any);
    }

    const centerSource = map.getSource("center-point") as mapboxgl.GeoJSONSource | undefined;
    if (centerSource) {
      centerSource.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: centerLngLat },
          },
        ],
      } as any);
    }
  }

  async function fetchLayersWithinRadius(centerLngLat: [number, number], miles: number) {
    try {
      setLayerError(null);

      const lat = centerLngLat[1];
      const lng = centerLngLat[0];

      // Quick distance filter (bounding box). We'll refine later if needed.
      const latDelta = miles / 69; // ~69 miles per degree latitude
      const lngDelta = miles / 54; // rough; acceptable for MVP

      if (showDataCenters) {
        const { data, error } = await supabase
          .from("data_centers")
          .select("id,name,status,lat,lng,source")
          .gte("lat", lat - latDelta)
          .lte("lat", lat + latDelta)
          .gte("lng", lng - lngDelta)
          .lte("lng", lng + lngDelta)
          .limit(2000);

        if (error) throw error;
        setDataCenters((data ?? []) as any);
      } else {
        setDataCenters([]);
      }

      if (showEpaFacilities) {
        const { data, error } = await supabase
          .from("epa_facilities")
          .select("id,name,lat,lng,source")
          .gte("lat", lat - latDelta)
          .lte("lat", lat + latDelta)
          .gte("lng", lng - lngDelta)
          .lte("lng", lng + lngDelta)
          .limit(2000);

        if (error) throw error;
        setEpaFacilities((data ?? []) as any);
      } else {
        setEpaFacilities([]);
      }
    } catch (e: any) {
      setLayerError(e?.message ?? "Failed to load map layers");
    }
  }

  function cToF(c: number) {
    return (c * 9) / 5 + 32;
  }
  function msToMph(ms: number) {
    return ms * 2.236936;
  }

  async function fetchWeather(lat: number, lng: number) {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,relative_humidity_2m,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min` +
      `&temperature_unit=celsius&wind_speed_unit=ms` +
      `&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather request failed");
    const data = await res.json();

    const tempF = data?.current?.temperature_2m != null ? cToF(data.current.temperature_2m) : null;
    const humidity = data?.current?.relative_humidity_2m ?? null;
    const windMph = data?.current?.wind_speed_10m != null ? msToMph(data.current.wind_speed_10m) : null;

    const todayHighF =
      data?.daily?.temperature_2m_max?.[0] != null ? cToF(data.daily.temperature_2m_max[0]) : null;
    const todayLowF =
      data?.daily?.temperature_2m_min?.[0] != null ? cToF(data.daily.temperature_2m_min[0]) : null;

    return { tempF, humidity, windMph, todayHighF, todayLowF };
  }

  async function fetchAirQuality(lat: number, lng: number) {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality` +
      `?latitude=${lat}&longitude=${lng}` +
      `&current=pm2_5,pm10,us_aqi,aerosol_optical_depth,dust` +
      `&timezone=auto`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Air quality request failed");
    const data = await res.json();

    const pm25 = data?.current?.pm2_5 ?? null;
    const pm10 = data?.current?.pm10 ?? null;
    const usAqi = data?.current?.us_aqi ?? null;
    const aod = data?.current?.aerosol_optical_depth ?? null;
    const dust = data?.current?.dust ?? null;

    return { pm25, pm10, usAqi, aod, dust };
  }

  function smokeSignal(a: typeof air) {
    if (!a) return { label: "—", level: "unknown" as const };

    // Conservative, MVP thresholds. We'll refine later.
    const pm25 = a.pm25 ?? 0;
    const aod = a.aod ?? 0;

    // If AQI is available, we can use it as a stronger signal too.
    const aqi = a.usAqi ?? null;

    // Basic heuristic
    const likely = pm25 >= 25 || aod >= 0.5 || (aqi != null && aqi >= 120);
    const possible = pm25 >= 15 || aod >= 0.3 || (aqi != null && aqi >= 80);

    if (likely) return { label: "Likely smoky", level: "high" as const };
    if (possible) return { label: "Possible smoke", level: "medium" as const };
    return { label: "No smoke signal", level: "low" as const };
  }

  // Search with a light debounce
  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setResults([]);
      setSearchError(null);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError(null);
        const r = await geocode(query.trim());
        setResults(r);
      } catch (e: any) {
        setSearchError(e?.message ?? "Search failed");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query]);

  function selectResult(r: GeocodeFeature) {
    setSelectedPlace(r);
    setResults([]);
    setQuery(r.place_name);
  }

  return (
    <div className="w-full h-[calc(100vh-0px)] flex">
      {/* Left panel */}
      <div className="w-full max-w-md border-r border-black/10 p-4 space-y-4">
        <div>
          <div className="text-xl font-semibold">Arounded</div>
          <div className="text-sm opacity-70">Search a place, set a radius, explore layers.</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Address, city, ZIP"
            className="w-full rounded-lg border border-black/15 px-3 py-2 outline-none"
          />
          <div className="text-xs opacity-70">
            {isSearching ? "Searching…" : searchError ? searchError : " "}
          </div>

          {results.length > 0 && (
            <div className="rounded-lg border border-black/10 overflow-hidden">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectResult(r)}
                  className="w-full text-left px-3 py-2 hover:bg-black/5 border-b border-black/5 last:border-b-0"
                >
                  <div className="text-sm">{r.place_name}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Radius</label>
          <div className="flex gap-2 flex-wrap">
            {RADIUS_OPTIONS_MILES.map((m) => (
              <button
                key={m}
                onClick={() => setRadiusMiles(m)}
                className={`px-3 py-1.5 rounded-full border text-sm ${
                  radiusMiles === m ? "border-black/40" : "border-black/15"
                }`}
              >
                {m} mi
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Layers</label>

          <div className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2">
            <div className="text-sm">Data centers</div>
            <input
              type="checkbox"
              checked={showDataCenters}
              onChange={(e) => setShowDataCenters(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2">
            <div className="text-sm">EPA facilities</div>
            <input
              type="checkbox"
              checked={showEpaFacilities}
              onChange={(e) => setShowEpaFacilities(e.target.checked)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <div className="text-sm">Smoke</div>
            <input
              type="checkbox"
              checked={showSmoke}
              onChange={(e) => setShowSmoke(e.target.checked)}
            />
          </div>

          <div className="text-xs opacity-60 px-1">
            Daily smoke layer<br />
            Based on NOAA satellite analysis. Updated once per day.
          </div>

          {layerError && <div className="text-xs text-red-600">{layerError}</div>}

          <div className="text-xs opacity-70">
            Loaded: {dataCenters.length} data centers, {epaFacilities.length} EPA facilities
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Conditions</label>

          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm space-y-2">
            {conditionsLoading && <div className="opacity-70">Loading conditions…</div>}

            {conditionsError && <div className="text-xs text-red-400">{conditionsError}</div>}

            {!conditionsLoading && !conditionsError && (
              <>
                <div className="flex items-center justify-between">
                  <div className="opacity-80">Temp</div>
                  <div>
                    {weather?.tempF != null ? `${Math.round(weather.tempF)}°F` : "—"}
                    <span className="opacity-60">
                      {weather?.todayHighF != null && weather?.todayLowF != null
                        ? `  (H ${Math.round(weather.todayHighF)} / L ${Math.round(weather.todayLowF)})`
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="opacity-80">Humidity</div>
                  <div>{weather?.humidity != null ? `${Math.round(weather.humidity)}%` : "—"}</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="opacity-80">Wind</div>
                  <div>{weather?.windMph != null ? `${Math.round(weather.windMph)} mph` : "—"}</div>
                </div>

                <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                  <div className="opacity-80">Air</div>
                  <div>
                    {air?.usAqi != null ? `AQI ${Math.round(air.usAqi)}` : air?.pm25 != null ? `PM2.5 ${air.pm25}` : "—"}
                  </div>
                </div>

                {showSmoke && (
                  <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                    <div className="opacity-80">Smoke</div>
                    <div>{smokeSignal(air).label}</div>
                  </div>
                )}

                {showSmoke && air?.pm25 != null && (
                  <div className="text-xs opacity-60">
                    Based on PM2.5 and atmospheric aerosol indicators.
                  </div>
                )}

                <div className="text-xs opacity-60">
                  (MVP) Air values are estimates; we'll add source links + improved AQI later.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-black/10 p-3 text-sm space-y-1">
          <div className="font-medium">Current selection</div>
          <div className="opacity-80">
            {selectedPlace ? selectedPlace.place_name : "Default (Leesburg area)"}
          </div>
          <div className="opacity-70">
            Center: {center[1].toFixed(4)}, {center[0].toFixed(4)}
          </div>
        </div>

        <div className="text-xs opacity-60">
          Next: data center + EPA facility layers, then AQI/smoke/weather, then timeline.
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}