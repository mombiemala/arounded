import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import SourceLink from "@/src/components/SourceLink";
import Tooltip from "@/src/components/Tooltip";

const card =
  "border border-white/10 rounded-xl p-6 bg-white/5 transition-colors hover:border-brand/30 hover:bg-white/[0.07]";
const callout =
  "border border-white/10 rounded-xl p-6 bg-white/5";
const eyebrow =
  "font-mono text-xs uppercase tracking-[0.16em] text-brand mb-3";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-brand mb-6">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand" />
            What&apos;s nearby · How it&apos;s changing · Sources you can check
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-[1.05] tracking-tight">
            See what&apos;s moving in <span className="text-brand">around you</span>.
          </h1>

          <p className="text-xl opacity-85 mb-8 leading-relaxed">
            Arounded is a free, transparent map of what surrounds the places you care about —
            data centers, industrial facilities, power plants, pollution, and wildfire smoke —
            and how it changes over time. Built for real questions: is something being built
            nearby, is my air getting worse, how do two neighborhoods compare?
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/map"
              className="px-6 py-3 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors text-center"
            >
              Explore the map
            </Link>
            <Link
              href="/compare"
              className="px-6 py-3 border border-white/20 rounded-lg font-medium hover:border-brand/60 hover:text-brand transition-colors text-center"
            >
              Compare two places
            </Link>
          </div>

          <p className="text-sm opacity-60 mt-4">
            No account needed to browse. Sign in to save places and track how they change over time.
          </p>
        </div>

        {/* Transparency Callout */}
        <div className="mt-12 max-w-5xl">
          <div className={callout}>
            <h2 className="text-lg font-semibold mb-3">No black boxes</h2>
            <div className="space-y-3 opacity-90 leading-relaxed text-sm">
              <p>
                Every layer names its source, so you never have to take our word for it —{" "}
                <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker" />, <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" />, <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo" />, <SourceLink href="https://www.epa.gov/frs" label="EPA" />, and <SourceLink href="https://www.mapbox.com/" label="Mapbox" />.
              </p>
              <p>
                We don&apos;t sell your data, and we don&apos;t track you around the web.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/methodology"
                className="text-sm text-brand hover:text-brand-strong transition-colors inline-flex items-center gap-1"
              >
                See our sources &amp; methods →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What this is */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="max-w-3xl">
          <div className={eyebrow}>The basics</div>
          <h2 className="text-3xl font-bold mb-6">What this is</h2>
          <div className="space-y-4 opacity-90 leading-relaxed">
            <p>
              Arounded shows you what&apos;s around a place — the built environment and the natural
              one — and how it&apos;s changing. Data centers and industrial facilities, power plants,
              air quality and wildfire smoke, all on one map, all with sources you can verify.
            </p>
            <p>
              It&apos;s built for the questions a single snapshot can&apos;t answer: is something being
              built near me, is my neighborhood getting better or worse, and how does one place compare
              to another over weeks and months?
            </p>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div>
          <div className={eyebrow}>Made for</div>
          <h2 className="text-3xl font-bold mb-2">Who it&apos;s for</h2>
          <p className="opacity-70 mb-8 max-w-2xl">
            Anyone trying to understand their surroundings — especially when something new shows up.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { t: "Concerned residents", d: "Wondering whether a data center or industrial project is coming near them." },
              { t: "Movers & buyers", d: "Comparing neighborhoods or weighing a move." },
              { t: "Organizers & journalists", d: "Tracking facilities and infrastructure, with sources to cite." },
              { t: "Sensitive to air quality", d: "Keeping an eye on smoke, pollution, and heat day to day." },
              { t: "Outdoor planners", d: "Timing exercise, travel, and daily routines around the air." },
              { t: "Researchers & the curious", d: "Exploring how a place changes over weeks and months." },
            ].map((x) => (
              <div key={x.t} className={`${card} flex gap-3`}>
                <span className="mt-1.5 inline-block w-2 h-2 rounded-full bg-brand shrink-0" />
                <div>
                  <div className="font-medium">{x.t}</div>
                  <p className="text-sm opacity-75 mt-0.5">{x.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="max-w-3xl">
          <div className={eyebrow}>Getting started</div>
          <h2 className="text-3xl font-bold mb-8">How it works</h2>

          <div className="space-y-4">
            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand/15 text-brand flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Look up your street — or anywhere</h3>
                  <p className="text-sm opacity-80">
                    Type an address, ZIP, or city, or let the map find where you are.
                  </p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand/15 text-brand flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">See what&apos;s around it</h3>
                  <p className="text-sm opacity-80">
                    Switch on data centers, facilities, power plants, air quality, and wildfire smoke.
                  </p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand/15 text-brand flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Tap anything to learn more</h3>
                  <p className="text-sm opacity-80">
                    Every point tells you what it is, its status, and where the data came from.
                  </p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand/15 text-brand flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Save it and watch it change</h3>
                  <p className="text-sm opacity-80">
                    With a free account, we track conditions daily and can email you when a new
                    data center is proposed nearby.
                  </p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-brand/15 text-brand flex items-center justify-center font-semibold">
                  5
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Share what you find</h3>
                  <p className="text-sm opacity-80">
                    Send a link to a neighbor or your group — it opens the map right where you left it.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm opacity-70">
            One note: Arounded is for understanding and spotting patterns over time. In an
            emergency, always follow your official local alerts first.
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className={eyebrow}>Transparency</div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <h2 className="text-3xl font-bold">Where the data comes from</h2>
          <div className="text-sm opacity-60 max-w-xl">
            We show every source on purpose, so you can check what you&apos;re seeing for yourself.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className={card}>
            <h3 className="font-semibold mb-1">Smoke</h3>
            <p className="text-sm opacity-70">
              Source: <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA HMS Smoke Product" />
            </p>
            <p className="text-sm opacity-80 mt-3 leading-relaxed">
              Daily smoke plume polygons derived from satellite analysis. Used to calculate "smoke day" history for saved places.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-1">Air quality + weather</h3>
            <p className="text-sm opacity-70">
              Source: <SourceLink href="https://open-meteo.com/en/docs/air-quality-api" label="Open-Meteo Air Quality API" /> and <SourceLink href="https://open-meteo.com/en/docs" label="Weather API" />
            </p>
            <p className="text-sm opacity-80 mt-3 leading-relaxed">
              <Tooltip content="Air Quality Index — a 0–500 scale where higher means worse air.">
                <span className="underline decoration-dotted decoration-white/40 underline-offset-2">AQI</span>
              </Tooltip>{" "}
              and{" "}
              <Tooltip content="Fine particle pollution (2.5 microns) — the stuff in smoke and haze that reaches your lungs.">
                <span className="underline decoration-dotted decoration-white/40 underline-offset-2">PM2.5</span>
              </Tooltip>
              , plus daily conditions like temperature highs. Logged daily for your saved places.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-1">EPA facilities</h3>
            <p className="text-sm opacity-70">
              Source: <SourceLink href="https://www.epa.gov/frs" label="EPA Facility Registry Service (FRS)" />
            </p>
            <p className="text-sm opacity-80 mt-3 leading-relaxed">
              Regulated facilities, queried on demand from the EPA FRS radial search around your view.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-1">Data centers</h3>
            <p className="text-sm opacity-70">
              Source: <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker Alliance" />
            </p>
            <p className="text-sm opacity-80 mt-3 leading-relaxed">
              Data centers near you, with operator, power demand, and cooling where available —
              color-coded by status. Refreshed weekly.
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-xs opacity-90">
              {[
                { c: "#ff6b6b", l: "Operating", d: "Up and running today." },
                { c: "#ffa94d", l: "Under construction", d: "Approved or actively being built." },
                { c: "#ffd43b", l: "Proposed", d: "Announced, in permitting, or awaiting approval." },
                { c: "#868e96", l: "Cancelled", d: "Withdrawn or blocked." },
              ].map((s) => (
                <Tooltip key={s.l} content={s.d}>
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.c }} />
                  {s.l}
                </Tooltip>
              ))}
            </div>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-1">Power plants</h3>
            <p className="text-sm opacity-70">
              Source: <SourceLink href="https://www.openstreetmap.org/" label="OpenStreetMap" />
            </p>
            <p className="text-sm opacity-80 mt-3 leading-relaxed">
              Power generation sites (with fuel and capacity where tagged), queried on demand via Overpass.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-1">Air-quality stations</h3>
            <p className="text-sm opacity-70">
              Source: <SourceLink href="https://openaq.org/" label="OpenAQ" />
            </p>
            <p className="text-sm opacity-80 mt-3 leading-relaxed">
              Locations of real-world monitoring stations, complementing the modeled air-quality values.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-1">Basemap</h3>
            <p className="text-sm opacity-70">
              Source: <SourceLink href="https://www.mapbox.com/" label="Mapbox" />
            </p>
            <p className="text-sm opacity-80 mt-3 leading-relaxed">
              Map tiles and geocoding used for search and navigation.
            </p>
          </div>
        </div>
      </section>

      {/* Free vs account */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className={eyebrow}>What you get</div>
        <h2 className="text-3xl font-bold mb-8">Free to explore, free to save</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          <div className={card}>
            <h3 className="font-semibold text-lg mb-4">Free (always)</h3>
            <ul className="space-y-2 text-sm opacity-90">
              <li className="flex items-start gap-2">
                <span className="text-brand">✓</span>
                <span>Explore any place and every public layer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand">✓</span>
                <span>Check current air, weather, and what&apos;s nearby</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand">✓</span>
                <span>Share a map link with anyone</span>
              </li>
            </ul>
          </div>

          <div className={card}>
            <h3 className="font-semibold text-lg mb-4">With an account</h3>
            <ul className="space-y-2 text-sm opacity-90">
              <li className="flex items-start gap-2">
                <span className="text-brand">✓</span>
                <span>Save your places — home, work, school, wherever</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand">✓</span>
                <span>See 90 days of history and trends, tracked for you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand">✓</span>
                <span>Get alerts when a data center is proposed nearby</span>
              </li>
            </ul>

            <div className="mt-5 text-xs opacity-60 leading-relaxed">
              Signing in just keeps your places with you across devices. No profile, no feed, no noise.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className={eyebrow}>Good to know</div>
        <h2 className="text-3xl font-bold mb-8">Common questions</h2>

        <div className="max-w-3xl space-y-6">
          <div className={card}>
            <h3 className="font-semibold mb-2">Is a data center being built near me?</h3>
            <p className="opacity-80 text-sm leading-relaxed">
              Search your address and turn on the Data centers layer. You&apos;ll see sites near you
              color-coded by status — operating, under construction, or proposed — with the operator
              and power use where we have them. Save your place and we&apos;ll let you know when a new
              one shows up.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-2">Where does the data come from?</h3>
            <p className="opacity-80 text-sm leading-relaxed">
              Public and open sources, and we name every one so you can check it yourself — {" "}
              <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker" /> for data centers, {" "}
              <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" /> for smoke, {" "}
              <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo" /> for air and weather, and {" "}
              <SourceLink href="https://www.epa.gov/frs" label="EPA" /> for facilities. See the{" "}
              <Link href="/methodology" className="underline hover:opacity-80">methodology</Link> for the full list.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-2">How often does it update?</h3>
            <p className="opacity-80 text-sm leading-relaxed">
              Smoke refreshes daily and the data-center tracker weekly. For your saved places, we log
              conditions once a day so the history stays consistent. Live values can change fast — for
              anything urgent, follow your official local alerts.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-2">What&apos;s a &quot;smoke day&quot;?</h3>
            <p className="opacity-80 text-sm leading-relaxed">
              A day when a <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" /> satellite
              smoke plume passed over your saved place. It&apos;s a steady way to spot patterns over time
              — not a measure of what you actually breathed indoors.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-2">Do I need an account? Is it free?</h3>
            <p className="opacity-80 text-sm leading-relaxed">
              The map is free and open to everyone — no account needed to explore. Sign in only if you
              want to save places, see their history, and get alerts. That part&apos;s free too.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="rounded-2xl border border-brand/25 bg-brand/[0.07] p-8 sm:p-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
            See what&apos;s around your place.
          </h2>
          <p className="opacity-80 max-w-xl mx-auto mb-8">
            It&apos;s free, no account needed to start. Search your address and turn on the layers
            that matter to you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/map"
              className="px-6 py-3 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors"
            >
              Explore the map
            </Link>
            <Link
              href="/compare"
              className="px-6 py-3 border border-white/20 rounded-lg font-medium hover:border-brand/60 hover:text-brand transition-colors"
            >
              Compare two places
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm opacity-60">
              © {new Date().getFullYear()} Arounded
            </div>

            <div className="flex gap-6 text-sm">
              <Link
                href="/about"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                About
              </Link>
              <Link
                href="/changes"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                Changes
              </Link>
              <Link
                href="/methodology"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                Methodology
              </Link>
              <Link
                href="/privacy"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                Privacy
              </Link>
            </div>
          </div>

          <div className="mt-6 text-xs opacity-50 max-w-3xl leading-relaxed">
            Arounded is here to help you understand your surroundings. It isn&apos;t medical advice or an
            emergency alert system — for urgent health or safety decisions, follow official local and
            federal guidance.
          </div>
        </div>
      </footer>
    </div>
  );
}