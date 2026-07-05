import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import SourceLink from "@/src/components/SourceLink";

const card = "border border-white/10 rounded-xl p-6 bg-white/5";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold mb-4">About Arounded</h1>
        <p className="text-lg opacity-85 leading-relaxed mb-10">
          Arounded is a free, transparent map for understanding the environment
          around the places you care about — and how it changes over time.
          Wildfire smoke, air quality, heat, and nearby facilities, drawn from
          public data sources you can verify.
        </p>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-3">Why it exists</h2>
            <div className="space-y-4 opacity-90 leading-relaxed">
              <p>
                Most tools show you a single number for right now. Real
                decisions — when to spend time outdoors, whether a neighborhood
                fits your family, what&apos;s being built nearby — need context
                over weeks and months, not just a snapshot.
              </p>
              <p>
                Arounded focuses on that context: consistent daily signals,
                clearly-sourced layers, and a{" "}
                <Link href="/changes" className="underline hover:opacity-80">
                  change log
                </Link>{" "}
                so you can see what moved and when.
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-3">What&apos;s on the map</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={card}>
                <h3 className="font-semibold mb-1">Wildfire smoke</h3>
                <p className="text-sm opacity-80">
                  Daily satellite smoke plumes from{" "}
                  <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA HMS" />.
                </p>
              </div>
              <div className={card}>
                <h3 className="font-semibold mb-1">Air &amp; weather</h3>
                <p className="text-sm opacity-80">
                  AQI, PM2.5, and conditions from{" "}
                  <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo" />, plus monitoring stations from{" "}
                  <SourceLink href="https://openaq.org/" label="OpenAQ" />.
                </p>
              </div>
              <div className={card}>
                <h3 className="font-semibold mb-1">Data centers</h3>
                <p className="text-sm opacity-80">
                  Proposed &amp; operating sites, by status, from{" "}
                  <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker" />.
                </p>
              </div>
              <div className={card}>
                <h3 className="font-semibold mb-1">Facilities &amp; power</h3>
                <p className="text-sm opacity-80">
                  Regulated sites from{" "}
                  <SourceLink href="https://www.epa.gov/frs" label="EPA FRS" />{" "}
                  and power plants from{" "}
                  <SourceLink href="https://www.openstreetmap.org/" label="OpenStreetMap" />.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-3">Our principles</h2>
            <div className="space-y-3">
              <div className={card}>
                <p className="opacity-90">
                  <span className="font-medium">Transparent by default.</span>{" "}
                  Every layer names its source so you can check it yourself. See
                  the{" "}
                  <Link href="/methodology" className="underline hover:opacity-80">
                    methodology
                  </Link>
                  .
                </p>
              </div>
              <div className={card}>
                <p className="opacity-90">
                  <span className="font-medium">Free and open access.</span> The
                  core map is free, with no account required to explore.
                </p>
              </div>
              <div className={card}>
                <p className="opacity-90">
                  <span className="font-medium">Privacy-respecting.</span> We
                  don&apos;t sell your data or track you across the web. Read our{" "}
                  <Link href="/privacy" className="underline hover:opacity-80">
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>

          <div className="text-sm opacity-70 leading-relaxed border-t border-white/10 pt-6">
            Arounded provides informational environmental signals. It is not
            medical advice and not an emergency alert system. For urgent health
            or safety decisions, use official local and federal guidance.
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/map"
              className="px-6 py-3 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors text-center"
            >
              Explore the map
            </Link>
            <Link
              href="/changes"
              className="px-6 py-3 border border-white/20 rounded-lg font-medium hover:border-white/40 transition-colors text-center"
            >
              See what&apos;s changed
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
