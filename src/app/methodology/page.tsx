import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import SourceLink from "@/src/components/SourceLink";

const eyebrow = "font-mono text-xs uppercase tracking-[0.16em] text-brand mb-3";
const wrap = "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8";
const section = "py-14 border-t border-white/10";
const LAST_UPDATED = "July 2026";

const LAYERS = [
  {
    t: "Smoke",
    src: <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" />,
    d: "Daily satellite plume polygons.",
  },
  {
    t: "Air + weather",
    src: <SourceLink href="https://open-meteo.com/en/docs/air-quality-api" label="Open-Meteo" />,
    d: "AQI, PM2.5, and current conditions.",
  },
  {
    t: "EPA facilities",
    src: <SourceLink href="https://www.epa.gov/frs" label="EPA FRS" />,
    d: "Regulated sites, searched on demand.",
  },
  {
    t: "Data centers",
    src: <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker" />,
    d: "Proposed to operating, by status.",
  },
  {
    t: "Power plants",
    src: <SourceLink href="https://www.openstreetmap.org/" label="OpenStreetMap" />,
    d: "Generation sites, via Overpass.",
  },
  {
    t: "Air-quality stations",
    src: <SourceLink href="https://openaq.org/" label="OpenAQ" />,
    d: "Real-world monitoring locations.",
  },
];

const FREQUENCY = [
  { t: "Smoke layer", d: <>Refreshed daily (<SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" /> daily plume update).</> },
  { t: "Saved-place history", d: "Logged once per day for your saved places." },
  { t: "Data centers", d: <>Refreshed weekly from <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker" />.</> },
  { t: "EPA, power plants, air stations", d: "Fetched on demand for the area you're viewing." },
  { t: "Air + weather conditions", d: <>Fetched on demand when you view a location (<SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo" />).</> },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />

      <div className={`${wrap} py-16`}>
        {/* Header */}
        <div className={eyebrow}>Methodology</div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          How the map is built
        </h1>
        <p className="text-sm opacity-55">Last updated: {LAST_UPDATED}</p>

        {/* The short version — prose, not a box */}
        <div className="mt-10 max-w-2xl">
          <p className="text-lg opacity-85 leading-relaxed">
            Arounded is a free, transparent map of what&apos;s around the places you care about —
            the built environment and the natural one — and how it changes over time. We use
            public data, name every source, and would rather say &quot;unknown&quot; than guess.
          </p>
          <p className="mt-4 opacity-70 leading-relaxed border-l-2 border-white/15 pl-4">
            For anything urgent — health, evacuation, an emergency — follow your official alerts
            first. Arounded is for context and patterns, not split-second calls.
          </p>
        </div>

        {/* Sources at a glance — hairline columns */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-7">
          {LAYERS.map((l) => (
            <div key={l.t} className="border-t border-white/10 pt-4">
              <h3 className="font-semibold mb-1">{l.t}</h3>
              <div className="text-xs opacity-55 mb-1.5">{l.src}</div>
              <p className="text-sm opacity-75 leading-relaxed">{l.d}</p>
            </div>
          ))}
        </div>

        {/* What Arounded shows */}
        <section className={`${section} mt-4`}>
          <div className={eyebrow}>The idea</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">What Arounded shows</h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl">
            <p>
              Arounded helps you understand what&apos;s happening around a location — and what&apos;s been
              happening over time. Instead of only showing &quot;right now,&quot; it&apos;s built to surface
              patterns like smoke days over the last month or repeated AQI spikes.
            </p>
            <p>
              We pull from public sources and present the results on a map. In a few places, we
              compute simple derived signals (like &quot;smoke day&quot;) to make history consistent and
              easier to interpret.
            </p>
          </div>
        </section>

        {/* Smoke */}
        <section className={section}>
          <div className={eyebrow}>
            <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA HMS" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Smoke</h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>
              Smoke plume data comes from <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA's" /> daily satellite analysis. It&apos;s published as
              GeoJSON polygons and commonly includes density categories (Light, Medium, Heavy),
              when available in the source dataset. Arounded refreshes it daily and displays it as an
              overlay on the map.
            </p>
            <div className="border-l-2 border-brand/40 pl-4">
              <p className="font-semibold mb-1">What &quot;smoke day&quot; means</p>
              <p className="opacity-80">
                A day when a <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" /> smoke plume polygon overlapped a saved location at
                least once. We calculate this with geometry-based detection (point-in-polygon), then
                log it daily for saved places.
              </p>
              <p className="text-xs opacity-55 mt-2">
                It&apos;s a consistent signal for pattern tracking — it does not measure indoor
                exposure or duration.
              </p>
            </div>
            <p className="text-xs opacity-55">
              Notes: satellite interpretation can miss low-level smoke or fast-changing events.
              Conditions can change quickly within a day.
            </p>
          </div>
        </section>

        {/* Air quality */}
        <section className={section}>
          <div className={eyebrow}>
            <SourceLink href="https://open-meteo.com/en/docs/air-quality-api" label="Open-Meteo Air Quality" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Air quality</h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>
              Arounded shows PM2.5 and US AQI values for a location. PM2.5 refers to fine
              particulate matter. US AQI is a standardized scale that converts pollutant levels
              into a single number that&apos;s easier to interpret (higher = worse air quality).
            </p>
            <p>
              For saved places, we log daily values once per day so you can see history and
              trends over the last 90 days — smoke-day counts, and average and peak AQI.
            </p>
            <p className="text-xs opacity-55">
              Notes: air-quality values can be based on a mix of station observations and models.
              Local micro-conditions may differ from the nearest estimate.
            </p>
          </div>
        </section>

        {/* Weather */}
        <section className={section}>
          <div className={eyebrow}>
            <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo Weather" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Weather</h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>
              Weather includes temperature and daily highs/lows (and may include wind/humidity
              depending on the view). These values help explain context around air quality and
              smoke conditions.
            </p>
            <p className="text-xs opacity-55">
              Notes: forecasts are model-based and can vary by elevation, proximity to water,
              and urban heat effects.
            </p>
          </div>
        </section>

        {/* Nearby infrastructure */}
        <section className={section}>
          <div className={eyebrow}>On demand &amp; weekly</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">Nearby infrastructure</h2>

          <div className="space-y-8 max-w-2xl">
            <div className="border-t border-white/10 pt-5">
              <h3 className="font-semibold mb-1">EPA facilities</h3>
              <div className="text-xs opacity-55 mb-2">
                <SourceLink href="https://www.epa.gov/frs" label="EPA Facility Registry Service (FRS)" />
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                Regulated and monitored facilities are queried on demand from the <SourceLink href="https://www.epa.gov/frs" label="EPA FRS" /> radial
                search API around the area you&apos;re viewing, rather than mirrored — the national
                registry is far too large to store. We show locations and basic attributes from the
                source data.
              </p>
              <p className="text-xs opacity-55 mt-2">
                Notes: <SourceLink href="https://www.epa.gov/frs" label="EPA" /> records can lag real-world openings/closures and may be incomplete in
                some areas.
              </p>
            </div>

            <div className="border-t border-white/10 pt-5">
              <h3 className="font-semibold mb-1">Data centers</h3>
              <div className="text-xs opacity-55 mb-2">
                <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker Alliance U.S. Data Centers Tracker" />
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                Data centers come from <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker Alliance" />&apos;s open tracker, which documents
                proposed, approved/under-construction, expanding, and operating sites. Points are
                color-coded by status, and where available we show the operator, power demand (MW),
                cooling, size, and whether community opposition has been reported. Refreshed weekly.
              </p>
              <p className="text-xs opacity-55 mt-2">
                Notes: the tracker is a documentation effort, so some fields are incomplete and
                locations may be approximate for early-stage projects. For planning or advocacy,
                verify a specific site through local permitting, zoning, or operator documentation.
                FracTracker data is used here under its non-commercial terms with attribution.
              </p>
            </div>

            <div className="border-t border-white/10 pt-5">
              <h3 className="font-semibold mb-1">Power plants</h3>
              <div className="text-xs opacity-55 mb-2">
                <SourceLink href="https://www.openstreetmap.org/" label="OpenStreetMap" /> (via the Overpass API)
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                Power generation facilities are queried on demand from <SourceLink href="https://www.openstreetmap.org/" label="OpenStreetMap" /> for the area
                you&apos;re viewing, including fuel type and capacity where contributors have tagged
                them.
              </p>
              <p className="text-xs opacity-55 mt-2">
                Notes: OpenStreetMap is crowd-sourced, so coverage and detail vary by region.
              </p>
            </div>

            <div className="border-t border-white/10 pt-5">
              <h3 className="font-semibold mb-1">Air-quality stations</h3>
              <div className="text-xs opacity-55 mb-2">
                <SourceLink href="https://openaq.org/" label="OpenAQ monitoring locations" />
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                Physical air-quality monitoring stations are queried on demand from <SourceLink href="https://openaq.org/" label="OpenAQ" />, which
                aggregates government and research monitors. This complements the modeled air-quality
                values shown in the conditions panel with the locations of real-world sensors.
              </p>
            </div>
          </div>
        </section>

        {/* Change tracking */}
        <section className={section}>
          <div className={eyebrow}>Over time</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Change tracking</h2>
          <p className="opacity-80 leading-relaxed max-w-2xl text-[15px]">
            As datasets refresh, Arounded records when facilities appear or disappear so you can
            see how an area is changing, not just its current state. Those events are summarized
            in plain language on the{" "}
            <Link href="/changes" className="text-brand hover:text-brand-strong">change log</Link>.
          </p>
        </section>

        {/* Update frequency — divided list */}
        <section className={section}>
          <div className={eyebrow}>Cadence</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">Update frequency</h2>
          <dl className="divide-y divide-white/10 border-t border-white/10 max-w-2xl">
            {FREQUENCY.map((f) => (
              <div key={f.t} className="grid sm:grid-cols-[220px_1fr] gap-1 sm:gap-6 py-4">
                <dt className="font-semibold text-sm">{f.t}</dt>
                <dd className="text-sm opacity-75 leading-relaxed">{f.d}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Using it well */}
        <section className={section}>
          <div className={eyebrow}>Guidance</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Using it well</h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>
              Arounded is at its best for context and patterns — not split-second decisions. If
              you&apos;re deciding whether to evacuate, whether it&apos;s safe to be outside during
              an emergency, or managing serious symptoms, lean on official alerts and medical
              guidance first.
            </p>
            <p>
              For everyday life, the history view earns its keep: smoke days over the last month,
              repeated AQI spikes, or how heat and air quality shift with the seasons.
            </p>
          </div>
        </section>

        {/* Limitations */}
        <section className={section}>
          <div className={eyebrow}>Honest caveats</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Limitations</h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>
              Environmental conditions can change quickly. Any map-based view is an approximation of a
              complex world. Arounded prioritizes consistency and transparency over &quot;perfect precision.&quot;
            </p>
            <p>
              Smoke data is based on satellite interpretation and reflects where plumes were identified.
              &quot;Smoke day&quot; means plume overlap — it does not measure exposure duration, indoor air quality,
              or personal health impact.
            </p>
            <p>
              Air-quality estimates may differ from on-the-ground measurements, especially at very local
              scales. Facilities and infrastructure layers can contain omissions or out-of-date records
              depending on the source.
            </p>
            <p className="text-brand/90">
              If something looks wrong, treat it as a signal to verify — not a final answer.
            </p>
          </div>
        </section>

        {/* Not medical advice */}
        <section className={section}>
          <div className={eyebrow}>Important</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Not medical advice</h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>
              Arounded provides environmental information for educational purposes. It is not medical advice.
            </p>
            <p>
              If you have health concerns related to smoke or air quality, follow guidance from a healthcare
              professional and official public health agencies.
            </p>
          </div>
        </section>

        {/* Sources & attribution */}
        <section className={section}>
          <div className={eyebrow}>Credit where it&apos;s due</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Sources &amp; attribution</h2>
          <p className="opacity-80 leading-relaxed max-w-2xl text-[15px] mb-6">
            Arounded is built on public and openly-licensed data. We credit each source and respect its license.
          </p>
          <ul className="divide-y divide-white/10 border-t border-white/10 max-w-2xl text-sm">
            <li className="py-4 opacity-80 leading-relaxed">
              <SourceLink href="https://www.openstreetmap.org/copyright" label="OpenStreetMap" /> contributors — power plants and related features.
              Data is © OpenStreetMap contributors, available under the{" "}
              <SourceLink href="https://opendatacommons.org/licenses/odbl/" label="Open Database License (ODbL)" />.
            </li>
            <li className="py-4 opacity-80 leading-relaxed">
              <SourceLink href="https://openaq.org/" label="OpenAQ" /> — air-quality monitoring station locations.
            </li>
            <li className="py-4 opacity-80 leading-relaxed">
              <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker Alliance" /> — U.S. data-center tracker (proposed &amp; operating sites),
              used under its non-commercial terms with attribution.
            </li>
            <li className="py-4 opacity-80 leading-relaxed">
              <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA HMS" />,{" "}
              <SourceLink href="https://www.epa.gov/frs" label="EPA FRS" />, and{" "}
              <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo" /> — smoke, facilities, and weather/air data.
            </li>
            <li className="py-4 opacity-80 leading-relaxed">
              <SourceLink href="https://www.mapbox.com/" label="Mapbox" /> — base map tiles and geocoding.
            </li>
          </ul>
        </section>

        {/* Back to map */}
        <div className="pt-10 border-t border-white/10">
          <Link
            href="/map"
            className="inline-block px-6 py-3 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors"
          >
            Explore the map
          </Link>
        </div>
      </div>
    </div>
  );
}
