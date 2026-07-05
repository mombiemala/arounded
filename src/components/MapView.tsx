"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

// US EPA AQI categories — used to make the raw AQI number readable at a glance.
function aqiCategory(aqi: number): { label: string; color: string } {
  if (aqi <= 50) return { label: "Good", color: "#51cf66" };
  if (aqi <= 100) return { label: "Moderate", color: "#ffd43b" };
  if (aqi <= 150) return { label: "Unhealthy (sensitive)", color: "#ffa94d" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#ff6b6b" };
  if (aqi <= 300) return { label: "Very unhealthy", color: "#cc5de8" };
  return { label: "Hazardous", color: "#e64980" };
}

// Escape values before interpolating into popup HTML (defense against markup
// sneaking in through dataset fields).
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function pointCoords(
  feature: mapboxgl.GeoJSONFeature
): [number, number] | null {
  const geometry = feature.geometry;
  return geometry.type === "Point"
    ? (geometry.coordinates as [number, number])
    : null;
}

function dcStatus(status: unknown): { label: string; color: string } {
  switch (status) {
    case "proposed": return { label: "Proposed", color: "#ffd43b" };
    case "construction": return { label: "Under construction", color: "#ffa94d" };
    case "expanding": return { label: "Expanding", color: "#ffa94d" };
    case "cancelled": return { label: "Cancelled", color: "#868e96" };
    case "operational": return { label: "Operating", color: "#ff6b6b" };
    default: return { label: "Unknown", color: "#ff6b6b" };
  }
}

function pointsToFeatureCollection(
  items: PointItem[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: items.map((d) => ({
      type: "Feature",
      properties: {
        id: d.id,
        name: d.name,
        status: d.status ?? "unknown",
        source: d.source ?? "",
        fuel: d.fuel ?? null,
        capacity: d.capacity ?? null,
        notes: d.notes ?? null,
      },
      geometry: { type: "Point", coordinates: [d.lng, d.lat] },
    })),
  };
}

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

async function geocode(query: string): Promise<GeocodeFeature[]> {
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
import { supabase } from "@/lib/supabaseClient";
import { createBrowserClient } from "@/lib/supabaseBrowser";
import { useAuth } from "@/lib/useAuth";
import Link from "next/link";
import RecentChanges from "@/src/components/RecentChanges";
import Sparkline from "@/src/components/Sparkline";

type PointItem = {
  id: string;
  name: string;
  status?: string | null;
  lat: number;
  lng: number;
  source?: string | null;
  fuel?: string | null;
  capacity?: string | null;
  notes?: string | null;
};

type DailyConditionRow = {
  date: string;
  smoke_present: boolean | null;
  us_aqi: number | null;
  temp_max_f: number | null;
};

type SavedPlace = {
  id: string;
  label: string;
  name: string | null;
  lat: number;
  lng: number;
};

type HistoryStats = {
  smoke7: number;
  smoke30: number;
  smoke90: number;
  avgAqi: number | null;
  peakAqi: number | null;
  smokeTrend: "worse" | "better" | "flat" | null;
  summary: string | null;
};

const PLACE_LABEL_PRESETS = ["Home", "Work", "School", "Other"] as const;

export default function MapView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const skipSearchRef = useRef(false);
  const geoTriedRef = useRef(false);

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
  const [showPowerPlants, setShowPowerPlants] = useState(false);
  const [showAirStations, setShowAirStations] = useState(false);
  const [showSmoke, setShowSmoke] = useState(true);

  const [dataCenters, setDataCenters] = useState<PointItem[]>([]);
  const [epaFacilities, setEpaFacilities] = useState<PointItem[]>([]);
  const [powerPlants, setPowerPlants] = useState<PointItem[]>([]);
  const [airStations, setAirStations] = useState<PointItem[]>([]);
  const [layerError, setLayerError] = useState<string | null>(null);

  const [smokeData, setSmokeData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [smokeLoading, setSmokeLoading] = useState(false);

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

  const [history, setHistory] = useState<DailyConditionRow[] | null>(null);
  const [historyStats, setHistoryStats] = useState<HistoryStats | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [saveLabel, setSaveLabel] = useState("Home");
  const [copiedToast, setCopiedToast] = useState(false);
  const [initializedFromUrl, setInitializedFromUrl] = useState(false);

  const { user } = useAuth();
  const supabaseClient = createBrowserClient();

  // Read URL params on mount
  useEffect(() => {
    if (initializedFromUrl) return;

    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const z = searchParams.get("z");
    const layers = searchParams.get("layers");

    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setSelectedPlace({
          id: "url",
          place_name: `${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}`,
          center: [parsedLng, parsedLat],
        });
      }
    }

    if (z) {
      const parsedZ = parseFloat(z);
      if (!isNaN(parsedZ) && mapRef.current) {
        mapRef.current.setZoom(parsedZ);
      }
    }

    if (layers) {
      const layerList = layers.split(",");
      setShowDataCenters(layerList.includes("datacenters"));
      setShowEpaFacilities(layerList.includes("epa"));
      setShowPowerPlants(layerList.includes("power"));
      setShowAirStations(layerList.includes("air"));
      setShowSmoke(layerList.includes("smoke"));
    }

    setInitializedFromUrl(true);
  }, [searchParams, initializedFromUrl]);

  // On first load, center on the visitor's location — unless the URL already
  // specifies a place or one is selected. Falls back silently to the default.
  useEffect(() => {
    if (!initializedFromUrl || geoTriedRef.current) return;
    geoTriedRef.current = true;

    const hasUrlLocation = searchParams.get("lat") && searchParams.get("lng");
    if (hasUrlLocation || selectedPlace) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSelectedPlace({
          id: "geo",
          place_name: "Your location",
          center: [pos.coords.longitude, pos.coords.latitude],
        });
      },
      () => {
        // Permission denied or unavailable — keep the default view.
      },
      { timeout: 8000 }
    );
  }, [initializedFromUrl, searchParams, selectedPlace]);

  const center = useMemo<[number, number]>(() => {
    return selectedPlace?.center ?? DEFAULT_CENTER;
  }, [selectedPlace]);

  // Sync URL params when layer toggles change
  useEffect(() => {
    if (!initializedFromUrl || !mapRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const activeLayers: string[] = [];
    if (showDataCenters) activeLayers.push("datacenters");
    if (showEpaFacilities) activeLayers.push("epa");
    if (showPowerPlants) activeLayers.push("power");
    if (showAirStations) activeLayers.push("air");
    if (showSmoke) activeLayers.push("smoke");

    if (activeLayers.length > 0) {
      params.set("layers", activeLayers.join(","));
    } else {
      params.delete("layers");
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [showDataCenters, showEpaFacilities, showPowerPlants, showAirStations, showSmoke, initializedFromUrl, router]);

  // Sync zoom and center to URL when map moves (user interaction)
  useEffect(() => {
    if (!mapRef.current || !initializedFromUrl) return;

    const map = mapRef.current;
    let timeoutId: NodeJS.Timeout;

    const updateUrl = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const params = new URLSearchParams();
        const center = map.getCenter();
        const zoom = map.getZoom();

        params.set("lat", center.lat.toFixed(4));
        params.set("lng", center.lng.toFixed(4));
        params.set("z", zoom.toFixed(2));

        const activeLayers: string[] = [];
        if (showDataCenters) activeLayers.push("datacenters");
        if (showEpaFacilities) activeLayers.push("epa");
        if (showPowerPlants) activeLayers.push("power");
        if (showAirStations) activeLayers.push("air");
        if (showSmoke) activeLayers.push("smoke");

        if (activeLayers.length > 0) {
          params.set("layers", activeLayers.join(","));
        }

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        router.replace(newUrl, { scroll: false });
      }, 300);
    };

    map.on("moveend", updateUrl);
    map.on("zoomend", updateUrl);

    return () => {
      clearTimeout(timeoutId);
      map.off("moveend", updateUrl);
      map.off("zoomend", updateUrl);
    };
  }, [initializedFromUrl, router, showDataCenters, showEpaFacilities, showPowerPlants, showAirStations, showSmoke]);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
      console.error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
      return;
    }

    const initialCenter = searchParams.get("lat") && searchParams.get("lng")
      ? [parseFloat(searchParams.get("lng")!), parseFloat(searchParams.get("lat")!)] as [number, number]
      : DEFAULT_CENTER;
    const initialZoom = searchParams.get("z")
      ? parseFloat(searchParams.get("z")!)
      : DEFAULT_ZOOM;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: initialCenter,
      zoom: initialZoom,
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
          // Color by project status — the whole point of the layer.
          "circle-color": [
            "match",
            ["get", "status"],
            "proposed", "#ffd43b",
            "construction", "#ffa94d",
            "expanding", "#ffa94d",
            "cancelled", "#868e96",
            "operational", "#ff6b6b",
            "#ff6b6b",
          ],
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

      // Power plants source + layer
      map.addSource("power-plants", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "power-plants-layer",
        type: "circle",
        source: "power-plants",
        paint: {
          "circle-radius": 6,
          "circle-color": "#51cf66",
          "circle-stroke-color": "#000",
          "circle-stroke-width": 1,
          "circle-opacity": 0.85,
        },
      });
      map.setLayoutProperty("power-plants-layer", "visibility", "none");

      // Air-quality stations source + layer
      map.addSource("air-stations", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "air-stations-layer",
        type: "circle",
        source: "air-stations",
        paint: {
          "circle-radius": 5,
          "circle-color": "#22b8cf",
          "circle-stroke-color": "#000",
          "circle-stroke-width": 1,
          "circle-opacity": 0.85,
        },
      });
      map.setLayoutProperty("air-stations-layer", "visibility", "none");

      map.on("click", "data-centers-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties ?? {};
        const coords = pointCoords(f);
        if (!coords) return;

        const st = dcStatus(props.status);
        const notes = props.notes
          ? `<div style="opacity:.8; font-size:12px; margin-top:6px; line-height:1.5;">${escapeHtml(props.notes)}</div>`
          : "";

        new mapboxgl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(
            `
    <div style="font-size:13px; color:#fff; background:#111; padding:8px 10px; border-radius:6px; max-width:240px;">
      <div style="font-weight:600; margin-bottom:6px;">
        ${props.name ? escapeHtml(props.name) : "Data center"}
      </div>
      <div style="display:inline-flex; align-items:center; gap:6px; font-size:12px;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:9999px; background:${st.color};"></span>
        ${st.label}
      </div>
      ${notes}
      <div style="opacity:.55; font-size:11px; margin-top:6px;">
        Source: ${props.source ? escapeHtml(props.source) : "—"}
      </div>
    </div>
    `
          )
          .addTo(map);
      });

      map.on("click", "epa-facilities-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties ?? {};
        const coords = pointCoords(f);
        if (!coords) return;

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
        ${props.name ? escapeHtml(props.name) : "EPA Facility"}
      </div>
      <div style="opacity:.6; font-size:11px;">
        Source: ${props.source ? escapeHtml(props.source) : "—"}
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

      map.on("click", "power-plants-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties ?? {};
        const coords = pointCoords(f);
        if (!coords) return;

        const detailRows = [
          props.fuel ? `<div style="opacity:.85;">Fuel: ${escapeHtml(props.fuel)}</div>` : "",
          props.capacity ? `<div style="opacity:.85;">Capacity: ${escapeHtml(props.capacity)}</div>` : "",
        ].join("");

        new mapboxgl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(
            `
    <div style="font-size:13px; color:#fff; background:#111; padding:8px 10px; border-radius:6px; max-width:220px;">
      <div style="font-weight:600; margin-bottom:4px;">
        ${props.name ? escapeHtml(props.name) : "Power plant"}
      </div>
      ${detailRows}
      <div style="opacity:.6; font-size:11px; margin-top:4px;">
        Source: ${props.source ? escapeHtml(props.source) : "OpenStreetMap"}
      </div>
    </div>
    `
          )
          .addTo(map);
      });

      map.on("mouseenter", "power-plants-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "power-plants-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", "air-stations-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties ?? {};
        const coords = pointCoords(f);
        if (!coords) return;

        new mapboxgl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(
            `
    <div style="font-size:13px; color:#fff; background:#111; padding:8px 10px; border-radius:6px; max-width:220px;">
      <div style="font-weight:600; margin-bottom:4px;">
        ${props.name ? escapeHtml(props.name) : "Monitoring station"}
      </div>
      <div style="opacity:.6; font-size:11px;">
        Source: ${props.source ? escapeHtml(props.source) : "OpenAQ"}
      </div>
    </div>
    `
          )
          .addTo(map);
      });

      map.on("mouseenter", "air-stations-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "air-stations-layer", () => {
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

      map.on("click", "smoke-daily-layer", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const props = f.properties ?? {};
        const density = props.Density ? escapeHtml(props.Density) : "Unknown";

        new mapboxgl.Popup({ closeButton: true })
          .setLngLat(e.lngLat)
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
        Smoke plume
      </div>
      <div style="opacity:.85;">
        Density: ${density}
      </div>
      <div style="opacity:.6; font-size:11px; margin-top:4px;">
        Source: NOAA HMS
      </div>
    </div>
    `
          )
          .addTo(map);
      });

      map.on("mouseenter", "smoke-daily-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "smoke-daily-layer", () => {
        map.getCanvas().style.cursor = "";
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
  }, [center, radiusMiles]);

  useEffect(() => {
    if (!mapRef.current) return;
    fetchLayersWithinRadius(center, radiusMiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, radiusMiles, showDataCenters, showEpaFacilities, showPowerPlants, showAirStations]);

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
      } catch (e) {
        setConditionsError(e instanceof Error ? e.message : "Failed to load conditions");
        setWeather(null);
        setAir(null);
      } finally {
        setConditionsLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center]);

  async function fetchSavedPlaces(selectId?: string) {
    if (!user) return;

    const { data } = await supabaseClient
      .from("saved_places")
      .select("id,label,name,lat,lng")
      .order("created_at", { ascending: true });

    const places = (data ?? []) as SavedPlace[];
    setSavedPlaces(places);

    // Keep the current selection if it still exists; otherwise pick one.
    const next =
      selectId ??
      (places.some((p) => p.id === selectedPlaceId) ? selectedPlaceId : null) ??
      places[0]?.id ??
      null;
    setSelectedPlaceId(next);
    if (next) fetchHistory(next);
    else {
      setHistory(null);
      setHistoryStats(null);
    }
  }

  async function fetchHistory(placeId: string) {
    if (!user || !placeId) return;

    const now = new Date();
    const daysAgo = (n: number) => {
      const d = new Date(now);
      d.setDate(now.getDate() - n);
      return d.toISOString().slice(0, 10);
    };
    const today = now.toISOString().slice(0, 10);
    const d7s = daysAgo(7);
    const d30s = daysAgo(30);
    const d60s = daysAgo(60);
    const d90s = daysAgo(90);

    const { data } = await supabaseClient
      .from("daily_conditions")
      .select("date,smoke_present,us_aqi,temp_max_f")
      .eq("place_id", placeId)
      .gte("date", d90s)
      .lte("date", today)
      .order("date", { ascending: false });

    const rows = (data ?? []) as DailyConditionRow[];
    setHistory(rows);

    const smoke = (from: string, to?: string) =>
      rows.filter((r) => r.smoke_present && r.date >= from && (!to || r.date < to)).length;
    const avg = (from: string, to?: string) => {
      const vals = rows
        .filter((r) => r.us_aqi != null && r.date >= from && (!to || r.date < to))
        .map((r) => r.us_aqi as number);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const smoke7 = smoke(d7s);
    const smoke30 = smoke(d30s);
    const smoke90 = smoke(d90s);
    const recentSmoke = smoke30;
    const priorSmoke = smoke(d60s, d30s);
    const aqiVals = rows.filter((r) => r.us_aqi != null).map((r) => r.us_aqi as number);
    const avgAqi = aqiVals.length ? Math.round(aqiVals.reduce((a, b) => a + b, 0) / aqiVals.length) : null;
    const peakAqi = aqiVals.length ? Math.max(...aqiVals) : null;

    const recentAqi = avg(d30s);
    const priorAqi = avg(d60s, d30s);

    let smokeTrend: HistoryStats["smokeTrend"] = null;
    if (rows.some((r) => r.date < d30s)) {
      smokeTrend = recentSmoke > priorSmoke ? "worse" : recentSmoke < priorSmoke ? "better" : "flat";
    }

    // Plain-language summary — prefer the AQI comparison, fall back to smoke days.
    let summary: string | null = null;
    if (recentAqi != null && priorAqi != null && Math.abs(recentAqi - priorAqi) >= 4) {
      summary =
        recentAqi < priorAqi
          ? "Air has been cleaner than the previous month."
          : "Air has been worse than the previous month.";
    } else if (smokeTrend === "worse") {
      summary = `${recentSmoke - priorSmoke} more smoke day${recentSmoke - priorSmoke === 1 ? "" : "s"} than the previous month.`;
    } else if (smokeTrend === "better") {
      summary = `${priorSmoke - recentSmoke} fewer smoke day${priorSmoke - recentSmoke === 1 ? "" : "s"} than the previous month.`;
    } else if (rows.length > 0) {
      summary = "Steady compared with the previous month.";
    }

    setHistoryStats({ smoke7, smoke30, smoke90, avgAqi, peakAqi, smokeTrend, summary });
  }

  function selectSavedPlace(place: SavedPlace) {
    setSelectedPlaceId(place.id);
    setSelectedPlace({
      id: place.id,
      place_name: place.name ?? place.label,
      center: [place.lng, place.lat],
    });
    fetchHistory(place.id);
  }

  async function handleSaveLocation() {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    if (!selectedPlace) return;

    const label = saveLabel.trim() || "Home";

    setSavingLocation(true);
    try {
      const { data, error } = await supabaseClient
        .from("saved_places")
        .upsert(
          {
            user_id: user.id,
            label,
            name: selectedPlace.place_name,
            lat: center[1],
            lng: center[0],
          },
          { onConflict: "user_id,label" }
        )
        .select("id")
        .single();

      if (error) throw error;

      const newId = data?.id;
      await fetchSavedPlaces(newId);

      // Backfill ~30 days of conditions so the new place has history right away
      // instead of waiting for the daily cron. Best-effort, in the background.
      if (newId) {
        fetch("/api/conditions/daily-log")
          .then(() => fetchHistory(newId))
          .catch(() => {});
      }
    } catch (error) {
      console.error("Failed to save location:", error);
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleDeletePlace(id: string) {
    if (!user) return;
    try {
      const { error } = await supabaseClient
        .from("saved_places")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await fetchSavedPlaces();
    } catch (error) {
      console.error("Failed to delete place:", error);
    }
  }

  useEffect(() => {
    if (user) {
      fetchSavedPlaces();
    } else {
      setSavedPlaces([]);
      setSelectedPlaceId(null);
      setHistory(null);
      setHistoryStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("data-centers") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(pointsToFeatureCollection(dataCenters));

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

    source.setData(pointsToFeatureCollection(epaFacilities));

    map.setLayoutProperty(
      "epa-facilities-layer",
      "visibility",
      showEpaFacilities ? "visible" : "none"
    );
  }, [epaFacilities, showEpaFacilities]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("power-plants") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(pointsToFeatureCollection(powerPlants));

    map.setLayoutProperty(
      "power-plants-layer",
      "visibility",
      showPowerPlants ? "visible" : "none"
    );
  }, [powerPlants, showPowerPlants]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource("air-stations") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(pointsToFeatureCollection(airStations));

    map.setLayoutProperty(
      "air-stations-layer",
      "visibility",
      showAirStations ? "visible" : "none"
    );
  }, [airStations, showAirStations]);

  // Fetch the latest NOAA daily smoke GeoJSON once on mount
  useEffect(() => {
    let cancelled = false;

    const loadSmoke = async () => {
      try {
        setSmokeLoading(true);
        const urlRes = await fetch("/api/smoke/latest-url");
        if (!urlRes.ok) throw new Error("Could not resolve smoke data URL");
        const { url } = await urlRes.json();
        if (!url) throw new Error("No smoke data URL available");

        const geoRes = await fetch(url, { cache: "no-store" });
        if (!geoRes.ok) throw new Error("Could not load smoke GeoJSON");
        const geojson = await geoRes.json();

        if (!cancelled) setSmokeData(geojson);
      } catch (e) {
        // Non-fatal: the smoke layer simply stays empty.
        if (!cancelled) console.warn("Smoke layer unavailable:", e);
      } finally {
        if (!cancelled) setSmokeLoading(false);
      }
    };

    loadSmoke();
    return () => {
      cancelled = true;
    };
  }, []);

  // Push smoke data into the map source (retries once the style is ready)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !smokeData) return;

    const apply = () => {
      const source = map.getSource("smoke-daily") as mapboxgl.GeoJSONSource | undefined;
      if (source) source.setData(smokeData);
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }
  }, [smokeData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      if (!map.getLayer("smoke-daily-layer")) return;
      map.setLayoutProperty(
        "smoke-daily-layer",
        "visibility",
        showSmoke ? "visible" : "none"
      );
    };

    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("load", apply);
    }
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
      radiusSource.setData(circle);
    }

    const centerSource = map.getSource("center-point") as mapboxgl.GeoJSONSource | undefined;
    if (centerSource) {
      const centerFc: GeoJSON.FeatureCollection<GeoJSON.Point> = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: centerLngLat },
          },
        ],
      };
      centerSource.setData(centerFc);
    }
  }

  async function fetchLayersWithinRadius(centerLngLat: [number, number], miles: number) {
    try {
      setLayerError(null);

      const lat = centerLngLat[1];
      const lng = centerLngLat[0];

      // Bounding-box filter. ~69 miles per degree latitude; longitude degrees
      // shrink toward the poles, so scale by cos(latitude).
      const latDelta = miles / 69;
      const lngDelta = miles / (69 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

      if (showDataCenters) {
        const { data, error } = await supabase
          .from("data_centers")
          .select("id,name,status,lat,lng,source,notes")
          .gte("lat", lat - latDelta)
          .lte("lat", lat + latDelta)
          .gte("lng", lng - lngDelta)
          .lte("lng", lng + lngDelta)
          .limit(2000);

        if (error) throw error;
        setDataCenters((data ?? []) as PointItem[]);
      } else {
        setDataCenters([]);
      }

      // On-demand layers are proxied per view (the national datasets are far
      // too large to mirror). Each is guarded independently so one failing
      // layer doesn't blank the others.
      if (showEpaFacilities) {
        setEpaFacilities(
          await fetchNearby("/api/facilities/nearby", lat, lng, miles, "facilities")
        );
      } else {
        setEpaFacilities([]);
      }

      if (showPowerPlants) {
        setPowerPlants(
          await fetchNearby("/api/power-plants/nearby", lat, lng, miles, "plants")
        );
      } else {
        setPowerPlants([]);
      }

      if (showAirStations) {
        // Silent on failure: this layer no-ops until OPENAQ_API_KEY is set.
        setAirStations(
          await fetchNearby("/api/air-stations/nearby", lat, lng, miles, "stations", true)
        );
      } else {
        setAirStations([]);
      }
    } catch (e) {
      setLayerError(e instanceof Error ? e.message : "Failed to load map layers");
    }
  }

  async function fetchNearby(
    path: string,
    lat: number,
    lng: number,
    miles: number,
    key: "facilities" | "plants" | "stations",
    silent = false
  ): Promise<PointItem[]> {
    try {
      const res = await fetch(`${path}?lat=${lat}&lng=${lng}&radius=${miles}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.error ?? "Request failed");
      }
      return (json[key] ?? []) as PointItem[];
    } catch (e) {
      if (!silent) {
        setLayerError(e instanceof Error ? e.message : "Failed to load a map layer");
      }
      return [];
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
    // Skip the re-search triggered by filling the input after a selection.
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

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
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [query]);

  function selectResult(r: GeocodeFeature) {
    skipSearchRef.current = true;
    setSelectedPlace(r);
    setResults([]);
    setQuery(r.place_name);
  }

  return (
    <div className="w-full lg:min-h-[calc(100vh-64px)] flex flex-col lg:flex-row">
      {/* Left panel (below the map on mobile, beside it on desktop) */}
      <div className="w-full lg:max-w-md border-b lg:border-b-0 lg:border-r border-white/10 p-4 space-y-4 lg:overflow-y-auto lg:max-h-[calc(100vh-64px)] order-2 lg:order-1">
        <div>
          <div className="text-xl font-semibold">Arounded</div>
          <div className="text-sm opacity-70">Search a place, set a radius, explore layers.</div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length > 0) {
                e.preventDefault();
                selectResult(results[0]);
              }
            }}
            placeholder="Address, city, ZIP"
            aria-label="Search for a place"
            className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 outline-none placeholder:text-white/40 focus:border-white/40 transition-colors"
          />
          <div className="text-xs opacity-70">
            {isSearching ? "Searching…" : searchError ? searchError : " "}
          </div>

          {results.length > 0 && (
            <div className="rounded-lg border border-white/10 overflow-hidden bg-white/5">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectResult(r)}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 border-b border-white/5 last:border-b-0 transition-colors"
                >
                  <div className="text-sm">{r.place_name}</div>
                </button>
              ))}
            </div>
          )}

          {!isSearching &&
            !searchError &&
            query.trim().length >= 3 &&
            results.length === 0 &&
            query.trim() !== selectedPlace?.place_name?.trim() && (
              <div className="text-xs opacity-60 px-1">
                No matches found. Try a city, ZIP, or full address.
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
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  radiusMiles === m
                    ? "border-white/40 bg-white/10"
                    : "border-white/15 hover:border-white/30"
                }`}
              >
                {m} mi
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Layers</label>

          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
            <span className="text-sm flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#ff6b6b" }} />
              Data centers
            </span>
            <input
              type="checkbox"
              checked={showDataCenters}
              onChange={(e) => setShowDataCenters(e.target.checked)}
            />
          </label>

          {showDataCenters && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] opacity-70">
              {[
                { c: "#ff6b6b", l: "Operating" },
                { c: "#ffa94d", l: "Under construction" },
                { c: "#ffd43b", l: "Proposed" },
                { c: "#868e96", l: "Cancelled" },
              ].map((s) => (
                <span key={s.l} className="inline-flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.c }} />
                  {s.l}
                </span>
              ))}
            </div>
          )}

          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
            <span className="text-sm flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#4dabf7" }} />
              EPA facilities
            </span>
            <input
              type="checkbox"
              checked={showEpaFacilities}
              onChange={(e) => setShowEpaFacilities(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
            <span className="text-sm flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#51cf66" }} />
              Power plants
            </span>
            <input
              type="checkbox"
              checked={showPowerPlants}
              onChange={(e) => setShowPowerPlants(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
            <span className="text-sm flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#22b8cf" }} />
              Air-quality stations
            </span>
            <input
              type="checkbox"
              checked={showAirStations}
              onChange={(e) => setShowAirStations(e.target.checked)}
            />
          </label>

          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 cursor-pointer">
            <span className="text-sm flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: "#ffa94d" }} />
              Smoke
            </span>
            <input
              type="checkbox"
              checked={showSmoke}
              onChange={(e) => setShowSmoke(e.target.checked)}
            />
          </label>

          <div className="text-xs opacity-60 px-1">
            Daily smoke layer — NOAA satellite analysis, updated once per day.
            {smokeLoading
              ? " Loading plumes…"
              : smokeData?.features?.length != null
              ? ` ${smokeData.features.length} plume${smokeData.features.length === 1 ? "" : "s"} loaded.`
              : ""}
          </div>

          {layerError && <div className="text-xs text-red-600">{layerError}</div>}

          <div className="text-xs opacity-70">
            Loaded: {dataCenters.length} data centers
            {showEpaFacilities ? `, ${epaFacilities.length} EPA facilities` : ""}
            {showPowerPlants ? `, ${powerPlants.length} power plants` : ""}
            {showAirStations ? `, ${airStations.length} air stations` : ""}
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
                  <div className="text-right">
                    {air?.usAqi != null ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: aqiCategory(air.usAqi).color }}
                        />
                        <span>AQI {Math.round(air.usAqi)}</span>
                        <span className="opacity-60 text-xs">
                          {aqiCategory(air.usAqi).label}
                        </span>
                      </div>
                    ) : air?.pm25 != null ? (
                      `PM2.5 ${air.pm25}`
                    ) : (
                      "—"
                    )}
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
                  Air values are modeled estimates from Open-Meteo. For urgent
                  decisions, use official local alerts.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm space-y-1">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Current selection</div>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopiedToast(true);
                  setTimeout(() => setCopiedToast(false), 2000);
                } catch (err) {
                  console.error("Failed to copy:", err);
                }
              }}
              className="text-xs px-2 py-1 border border-white/20 rounded hover:border-white/40 transition-colors"
            >
              Share
            </button>
          </div>
          <div className="opacity-80">
            {selectedPlace ? selectedPlace.place_name : "Default (Leesburg area)"}
          </div>
          <div className="opacity-70">
            Center: {center[1].toFixed(4)}, {center[0].toFixed(4)}
          </div>
          {selectedPlace && user && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-1 flex-wrap">
                {PLACE_LABEL_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setSaveLabel(p)}
                    className={`px-2 py-1 rounded-full border text-xs transition-colors ${
                      saveLabel === p
                        ? "border-white/40 bg-white/10"
                        : "border-white/15 hover:border-white/30"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="Label (e.g. Home)"
                aria-label="Place label"
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs outline-none placeholder:text-white/40 focus:border-white/40 transition-colors"
              />
              <button
                onClick={handleSaveLocation}
                disabled={savingLocation}
                className="w-full px-3 py-2 text-xs border border-white/20 rounded-lg hover:border-white/40 transition-colors disabled:opacity-50"
              >
                {savingLocation
                  ? "Saving..."
                  : `Save as “${saveLabel.trim() || "Home"}”`}
              </button>
            </div>
          )}
          {selectedPlace && !user && (
            <button
              onClick={handleSaveLocation}
              className="mt-3 w-full px-3 py-2 text-xs border border-white/20 rounded-lg hover:border-white/40 transition-colors"
            >
              Save this place
            </button>
          )}
        </div>

        {showLoginPrompt && (
          <div className="rounded-lg border border-white/20 bg-white/10 p-4 space-y-3">
            <div className="font-medium text-sm">Sign in to save places</div>
            <p className="text-xs opacity-80">
              Create an account to save locations and track historical conditions.
            </p>
            <div className="flex gap-2">
              <Link
                href="/login"
                className="flex-1 px-4 py-2 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors text-center text-sm"
              >
                Sign in
              </Link>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="px-4 py-2 border border-white/20 rounded-lg hover:border-white/40 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {user && savedPlaces.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm space-y-2">
            <div className="font-medium">My places</div>
            <div className="space-y-1">
              {savedPlaces.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg border px-2 py-1.5 transition-colors ${
                    selectedPlaceId === p.id
                      ? "border-white/40 bg-white/10"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <button
                    onClick={() => selectSavedPlace(p)}
                    className="text-left flex-1 min-w-0"
                  >
                    <div className="text-xs font-medium">{p.label}</div>
                    {p.name && (
                      <div className="text-[11px] opacity-60 truncate">{p.name}</div>
                    )}
                  </button>
                  <button
                    onClick={() => handleDeletePlace(p.id)}
                    aria-label={`Delete ${p.label}`}
                    className="ml-2 text-sm opacity-50 hover:opacity-100 px-1 leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {user && selectedPlaceId && historyStats && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {savedPlaces.find((p) => p.id === selectedPlaceId)?.label ?? "Place"} history
              </div>
              <button
                className="text-xs underline opacity-80 hover:opacity-100"
                onClick={async () => {
                  await fetch("/api/conditions/daily-log");
                  if (selectedPlaceId) await fetchHistory(selectedPlaceId);
                }}
              >
                Refresh
              </button>
            </div>
            {historyStats.summary && (
              <div className="flex items-start gap-2">
                {historyStats.smokeTrend && (
                  <span
                    style={{
                      color:
                        historyStats.smokeTrend === "worse"
                          ? "#ff6b6b"
                          : historyStats.smokeTrend === "better"
                          ? "#51cf66"
                          : "#868e96",
                    }}
                  >
                    {historyStats.smokeTrend === "worse"
                      ? "↑"
                      : historyStats.smokeTrend === "better"
                      ? "↓"
                      : "→"}
                  </span>
                )}
                <span className="opacity-90 text-xs leading-relaxed">{historyStats.summary}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              {[
                { k: "Smoke 7d", v: historyStats.smoke7 },
                { k: "Smoke 30d", v: historyStats.smoke30 },
                { k: "Smoke 90d", v: historyStats.smoke90 },
              ].map((s) => (
                <div key={s.k} className="rounded-lg bg-white/5 py-2">
                  <div className="text-base font-semibold">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-wide opacity-50">{s.k}</div>
                </div>
              ))}
            </div>

            {(historyStats.avgAqi != null || historyStats.peakAqi != null) && (
              <div className="pt-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="opacity-60">AQI · last 90 days</span>
                  <span className="opacity-80">
                    {historyStats.avgAqi != null ? `avg ${historyStats.avgAqi}` : ""}
                    {historyStats.peakAqi != null ? ` · peak ${historyStats.peakAqi}` : ""}
                  </span>
                </div>
                {history && (
                  <Sparkline values={[...history].reverse().map((r) => r.us_aqi)} />
                )}
              </div>
            )}

            {history && history.length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-1">
                <div className="text-xs opacity-60">Last 10 days</div>
                {history.slice(0, 10).map((r) => (
                  <div key={r.date} className="flex justify-between text-xs">
                    <div className="opacity-80">{r.date}</div>
                    <div className="opacity-80">
                      {r.smoke_present ? "Smoke" : "—"}{" "}
                      {r.us_aqi != null ? `• AQI ${r.us_aqi}` : ""}{" "}
                      {r.temp_max_f != null ? `• High ${Math.round(r.temp_max_f)}°` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!user && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
            <div className="font-medium mb-2">Saved places</div>
            <p className="text-xs opacity-70 mb-3">
              Sign in to save multiple places and track historical conditions.
            </p>
            <Link
              href="/login"
              className="inline-block px-4 py-2 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors text-xs"
            >
              Sign in
            </Link>
          </div>
        )}

        <RecentChanges />
      </div>

      {/* Map (full width on top on mobile, fills the right side on desktop) */}
      <div className="relative w-full h-[60vh] lg:h-auto lg:flex-1 order-1 lg:order-2">
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Copied Toast */}
        {copiedToast && (
          <div className="absolute top-4 right-4 bg-brand text-brand-ink px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-50">
            Copied!
          </div>
        )}
      </div>
    </div>
  );
}