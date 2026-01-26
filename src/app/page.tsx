import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import SourceLink from "@/src/components/SourceLink";

const card =
  "border border-white/10 rounded-xl p-6 bg-white/5";
const callout =
  "border border-white/10 rounded-xl p-6 bg-white/5";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm opacity-90 mb-6">
            <span className="inline-block w-2 h-2 rounded-full bg-white/60" />
            Updated daily • Transparent sources • Built for public access
          </div>

          <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Understand what’s around you — and how it’s changing.
          </h1>

          <p className="text-xl opacity-85 mb-8 leading-relaxed">
            Arounded is a free map for tracking environmental signals over time —
            wildfire smoke, air quality, heat, and nearby facilities. It's built
            for real-life decisions: planning outdoor time, comparing neighborhoods,
            understanding what's nearby, and spotting patterns over weeks or months.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/map"
              className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors text-center"
            >
              Explore the map
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border border-white/20 rounded-lg font-medium hover:border-white/40 transition-colors text-center"
            >
              Sign in to save places
            </Link>
          </div>

          <p className="text-sm opacity-60 mt-4">
            No account needed to browse. Sign in only if you want to save locations and track history.
          </p>
        </div>

        {/* Transparency Callout */}
        <div className="mt-12 max-w-5xl">
          <div className={callout}>
            <h2 className="text-lg font-semibold mb-3">Transparency</h2>
            <div className="space-y-3 opacity-90 leading-relaxed text-sm">
              <p>
                Arounded uses public sources: <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" />, <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo" />, <SourceLink href="https://www.epa.gov/frs" label="EPA" />, and <SourceLink href="https://www.mapbox.com/" label="Mapbox" />.
              </p>
              <p>
                We don't sell user data, and we don't track you across the web.
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/methodology"
                className="text-sm underline hover:opacity-80 transition-opacity inline-flex items-center gap-1"
              >
                See sources & methodology →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What this is */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">What this is</h2>
          <div className="space-y-4 opacity-90 leading-relaxed">
            <p>
              Arounded helps you see environmental context the way people actually need it:
              not just a single number right now, but what’s been happening around the places
              you care about.
            </p>
            <p>
              Use it to check wildfire smoke patterns, compare air quality day to day, and understand
              what's nearby — whether you're planning outdoor time, comparing neighborhoods, or asking
              bigger community questions.
            </p>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">Who it's for</h2>

          <div className="space-y-3">
            <div className={card}>
              <p className="opacity-90">Anyone who wants context about the environment around them</p>
            </div>
            <div className={card}>
              <p className="opacity-90">People sensitive to smoke, pollution, heat, or air quality</p>
            </div>
            <div className={card}>
              <p className="opacity-90">Folks planning outdoor time, travel, or daily routines</p>
            </div>
            <div className={card}>
              <p className="opacity-90">People comparing neighborhoods or considering a move</p>
            </div>
            <div className={card}>
              <p className="opacity-90">Community members tracking facilities and infrastructure</p>
            </div>
            <div className={card}>
              <p className="opacity-90">Researchers, analysts, and curious humans exploring patterns over time</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold mb-8">How it works</h2>

          <div className="space-y-4">
            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Search a place (or explore anywhere)</h3>
                  <p className="text-sm opacity-80">
                    Look up any location — or zoom out and browse outside your area.
                  </p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Turn layers on/off</h3>
                  <p className="text-sm opacity-80">
                    Smoke, facilities, and infrastructure layers help you see what’s nearby.
                  </p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Click for details</h3>
                  <p className="text-sm opacity-80">
                    Tap points and shapes to understand what they represent and why they matter.
                  </p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Track history (with an account)</h3>
                  <p className="text-sm opacity-80">
                    Save a place and we log daily conditions so you can see patterns over the last 7/30 days.
                  </p>
                </div>
              </div>
            </div>

            <div className={card}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-semibold">
                  5
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Share a view</h3>
                  <p className="text-sm opacity-80">
                    Send a map link to a friend, family member, or group — context included.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm opacity-70">
            Heads up: Arounded is designed for clarity and pattern-spotting. For emergencies, always use official local alerts.
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <div className="flex items-end justify-between gap-6 mb-8">
          <h2 className="text-3xl font-bold">Data sources</h2>
          <div className="text-sm opacity-60 max-w-xl">
            Sources are intentionally shown so you can verify what you’re seeing.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              AQI and PM2.5, plus daily conditions (like temperature highs). Logged daily for saved places.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-1">Facilities</h3>
            <p className="text-sm opacity-70">
              Source: <SourceLink href="https://www.epa.gov/frs" label="EPA Facility Registry Service (FRS)" />
            </p>
            <p className="text-sm opacity-80 mt-3 leading-relaxed">
              Facility locations and regulatory datasets (coverage depends on layer availability).
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

          <div className={card}>
            <h3 className="font-semibold mb-1">Data centers</h3>
            <p className="text-sm opacity-70">
              Sources vary by region; see <Link href="/methodology" className="underline hover:opacity-80 transition-opacity">Methodology</Link>.
            </p>
            <p className="text-sm opacity-80 mt-3 leading-relaxed">
              Data center locations compiled from public listings and local documentation. Sources vary by region.
            </p>
          </div>
        </div>
      </section>

      {/* Free vs account */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <h2 className="text-3xl font-bold mb-8">Free vs account features</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          <div className={card}>
            <h3 className="font-semibold text-lg mb-4">Free (always)</h3>
            <ul className="space-y-2 text-sm opacity-90">
              <li className="flex items-start gap-2">
                <span className="text-white/60">✓</span>
                <span>Explore any location and all public layers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">✓</span>
                <span>View current conditions and inspect features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">✓</span>
                <span>Share map views for context</span>
              </li>
            </ul>
          </div>

          <div className={card}>
            <h3 className="font-semibold text-lg mb-4">With an account</h3>
            <ul className="space-y-2 text-sm opacity-90">
              <li className="flex items-start gap-2">
                <span className="text-white/60">✓</span>
                <span>Save places (Home, School, Work, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">✓</span>
                <span>Track 7/30-day history automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-white/60">✓</span>
                <span>Personalized panels for your saved places</span>
              </li>
            </ul>

            <div className="mt-5 text-xs opacity-60 leading-relaxed">
              Sign-in exists to keep your saved places consistent across devices. We don’t need a profile or a social feed.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/10">
        <h2 className="text-3xl font-bold mb-8">Frequently asked questions</h2>

        <div className="max-w-3xl space-y-6">
          <div className={card}>
            <h3 className="font-semibold mb-2">How often is the data updated?</h3>
            <p className="opacity-80 text-sm leading-relaxed">
              Smoke polygons are refreshed daily. For saved places, Arounded logs daily conditions once per day so you can see consistent history over time.
              “Right now” values can change quickly, so use official alerts for urgent situations.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-2">How do you calculate a "smoke day"?</h3>
            <p className="opacity-80 text-sm leading-relaxed">
              We use <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA's" /> daily smoke plume polygons and check whether your saved location falls inside a plume that day (geometry-based detection).
              It's a consistent signal for pattern tracking — not a medical exposure measurement.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-2">Do I need an account?</h3>
            <p className="opacity-80 text-sm leading-relaxed">
              No. You can explore the map without signing in. An account is only for saving places and seeing your personal history over time.
            </p>
          </div>

          <div className={card}>
            <h3 className="font-semibold mb-2">Is Arounded free?</h3>
            <p className="opacity-80 text-sm leading-relaxed">
              Yes — the core map experience is free. If we ever add optional paid features later, basic access and transparency stay intact.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm opacity-60">
              © {new Date().getFullYear()} Arounded
            </div>

            <div className="flex gap-6 text-sm">
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
              <Link
                href="/contact"
                className="opacity-60 hover:opacity-100 transition-opacity"
              >
                Contact
              </Link>
            </div>
          </div>

          <div className="mt-6 text-xs opacity-50 max-w-3xl leading-relaxed">
            Arounded provides informational environmental signals. It is not medical advice and not an emergency alert system.
            For urgent health or safety decisions, use official local and federal guidance.
          </div>
        </div>
      </footer>
    </div>
  );
}