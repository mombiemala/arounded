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
      style: "mapbox://styles/mapbox/light-v11",
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