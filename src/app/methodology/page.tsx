import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import SourceLink from "@/src/components/SourceLink";

const card = "border border-white/10 rounded-xl p-6 bg-white/5";
const callout = "border border-white/15 rounded-xl p-6 bg-white/5";
const LAST_UPDATED = "January 2026";

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">Methodology</h1>
            <p className="text-sm opacity-60">Last updated: {LAST_UPDATED}</p>
          </div>

          {/* Quick transparency summary */}
          <section className="mb-12">
            <div className={callout}>
              <h2 className="text-lg font-semibold mb-2">Quick summary</h2>
              <p className="text-sm opacity-85 leading-relaxed">
                Arounded is a free map for tracking environmental signals over time. We use public
                datasets, label sources clearly, and prefer “unknown” over guessing. If you’re making
                an urgent decision (health, evacuation, emergencies), always rely on official alerts
                first — Arounded is designed for context and patterns.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                  <div className="font-semibold">Smoke</div>
                  <div className="opacity-75">
                    <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" /> daily plume polygons
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                  <div className="font-semibold">Air + Weather</div>
                  <div className="opacity-75">
                    <SourceLink href="https://open-meteo.com/en/docs/air-quality-api" label="Open-Meteo Air Quality API" /> AQI/PM2.5 + <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo Weather API" /> conditions
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                  <div className="font-semibold">Facilities</div>
                  <div className="opacity-75">
                    <SourceLink href="https://www.epa.gov/frs" label="EPA" /> datasets (layer-dependent)
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/30 p-4">
                  <div className="font-semibold">Maps</div>
                  <div className="opacity-75">
                    <SourceLink href="https://www.mapbox.com/" label="Mapbox" /> tiles + geocoding
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What Arounded Shows */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">What Arounded shows</h2>
            <div className="space-y-4 opacity-90 leading-relaxed">
              <p>
                Arounded helps you understand what’s happening around a location — and what’s been
                happening over time. Instead of only showing “right now,” it’s built to surface
                patterns like smoke days over the last month or repeated AQI spikes.
              </p>
              <p>
                We pull from public sources and present the results on a map. In a few places, we
                compute simple derived signals (like “smoke day”) to make history consistent and
                easier to interpret.
              </p>
            </div>
          </section>

          {/* Smoke */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Smoke</h2>
            <div className={card}>
              <p className="text-sm opacity-70 mb-2">
                Source: <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA HMS Smoke Product" />
              </p>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  Smoke plume data comes from <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA's" /> daily satellite analysis. It's published as
                  GeoJSON polygons and commonly includes density categories (Light, Medium, Heavy),
                  when available in the source dataset.
                </p>
                <p>
                  Arounded refreshes smoke data daily and displays it as an overlay on the map.
                </p>

                <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4">
                  <p className="font-semibold mb-1">What “smoke day” means</p>
                  <p className="opacity-85">
                    A "smoke day" means a <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" /> smoke plume polygon overlapped a saved location at
                    least once on that day. We calculate this using geometry-based detection
                    (point-in-polygon), then log it daily for saved places.
                  </p>
                  <p className="text-xs opacity-60 mt-2">
                    This is a consistent signal for pattern tracking — it does not measure indoor
                    exposure or duration.
                  </p>
                </div>

                <p className="text-xs opacity-60">
                  Notes: Satellite interpretation can miss low-level smoke or fast-changing events.
                  Conditions can change quickly within a day.
                </p>
              </div>
            </div>
          </section>

          {/* Air Quality */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Air quality</h2>
            <div className={card}>
              <p className="text-sm opacity-70 mb-2">
                Source: <SourceLink href="https://open-meteo.com/en/docs/air-quality-api" label="Open-Meteo Air Quality API" />
              </p>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  Arounded shows PM2.5 and US AQI values for a location. PM2.5 refers to fine
                  particulate matter. US AQI is a standardized scale that converts pollutant levels
                  into a single number that's easier to interpret (higher = worse air quality).
                </p>
                <p>
                  For saved places, we log daily values once per day so you can see history over the
                  last 7/30 days.
                </p>
                <p className="text-xs opacity-60">
                  Notes: Air quality values can be based on a mix of station observations and models.
                  Local micro-conditions may differ from the nearest estimate.
                </p>
              </div>
            </div>
          </section>

          {/* Weather */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Weather</h2>
            <div className={card}>
              <p className="text-sm opacity-70 mb-2">
                Source: <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo Weather API" />
              </p>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  Weather includes temperature and daily highs/lows (and may include wind/humidity
                  depending on the view). These values help explain context around air quality and
                  smoke conditions.
                </p>
                <p className="text-xs opacity-60">
                  Notes: Forecasts are model-based and can vary by elevation, proximity to water,
                  and urban heat effects.
                </p>
              </div>
            </div>
          </section>

          {/* Facilities & Data Centers */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Facilities & data centers</h2>
            <div className="space-y-4 opacity-90 leading-relaxed">
              <div className={card}>
                <p className="text-sm opacity-70 mb-2">
                  Source: <SourceLink href="https://www.epa.gov/frs" label="EPA Facility Registry Service (FRS)" />
                </p>
                <p className="text-sm opacity-90 leading-relaxed">
                  Facility locations come from <SourceLink href="https://www.epa.gov/frs" label="EPA" /> datasets (coverage depends on the layer). These
                  may include regulated facilities, monitoring sites, and other environmental
                  infrastructure. We display locations and basic attributes provided in the source
                  data.
                </p>
                <p className="text-xs opacity-60 mt-3">
                  Notes: <SourceLink href="https://www.epa.gov/frs" label="EPA" /> datasets can lag real-world changes (openings/closures) and records may
                  be incomplete in some areas.
                </p>
              </div>

              <div className={card}>
                <p className="text-sm opacity-70 mb-2">
                  Compiled from multiple public sources. Coverage varies by region.
                </p>
                <p className="text-sm opacity-90 leading-relaxed">
                  Arounded highlights data center locations as a focused infrastructure layer. Data
                  center records may come from a mix of public datasets and maintained listings,
                  depending on what's available for a region.
                </p>
                <p className="text-xs opacity-60 mt-3">
                  Notes: "Data center" can mean different things (hyperscale vs. smaller facilities).
                  If you're using this for advocacy or planning, we recommend verifying a specific
                  site through local permitting, zoning, or operator documentation.
                </p>
              </div>
            </div>
          </section>

          {/* Update Frequency */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Update frequency</h2>
            <div className="space-y-3 opacity-90 leading-relaxed">
              <p>Different layers update at different intervals:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  <strong>Smoke layer:</strong> refreshed daily (<SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" /> daily plume update)
                </li>
                <li>
                  <strong>Saved place history:</strong> logged once per day for your saved places
                </li>
                <li>
                  <strong>Facilities:</strong> updated when source datasets refresh (varies by dataset)
                </li>
                <li>
                  <strong>Air + weather:</strong> fetched on demand when you view a location (<SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo" />)
                </li>
              </ul>
            </div>
          </section>

          {/* How to use responsibly */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">How to use Arounded responsibly</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  Arounded is best for context and patterns — not split-second decisions.
                  If you're deciding whether to evacuate, whether it's safe to be outdoors during an
                  emergency, or managing serious symptoms, always use official alerts and medical guidance first.
                </p>
                <p>
                  For everyday planning, the history view can be genuinely helpful: smoke days over
                  the last month, repeated AQI spikes, or seasonal changes in heat and air quality.
                </p>
              </div>
            </div>
          </section>

          {/* Limitations */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Limitations</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  Environmental conditions can change quickly. Any map-based view is an approximation of a complex world.
                  Arounded prioritizes consistency and transparency over "perfect precision."
                </p>
                <p>
                  Smoke data is based on satellite interpretation and reflects where plumes were identified.
                  "Smoke day" means plume overlap — it does not measure exposure duration, indoor air quality,
                  or personal health impact.
                </p>
                <p>
                  Air quality estimates may differ from on-the-ground measurements, especially at very local scales.
                  Facilities and infrastructure layers can contain omissions or out-of-date records depending on the source.
                </p>
                <p>
                  If something looks wrong, treat it as a signal to verify — not a final answer.
                </p>
              </div>
            </div>
          </section>

          {/* Not Medical Advice */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Not medical advice</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  Arounded provides environmental information for educational purposes. It is not medical advice.
                </p>
                <p>
                  If you have health concerns related to smoke or air quality, follow guidance from a healthcare professional
                  and official public health agencies.
                </p>
              </div>
            </div>
          </section>

          {/* Back to Map */}
          <div className="pt-8 border-t border-white/10">
            <Link
              href="/map"
              className="inline-block px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors"
            >
              Explore the map
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}