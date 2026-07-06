import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import SourceLink from "@/src/components/SourceLink";
import { HeroDecor } from "@/src/components/Decor";

const eyebrow = "font-mono text-xs uppercase tracking-[0.16em] text-brand mb-3";
const wrap = "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8";
const section = "py-16 border-t border-white/10";

const LAYERS = [
  {
    t: "Wildfire smoke",
    src: <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA HMS" />,
    d: "Daily satellite smoke plumes.",
  },
  {
    t: "Air & weather",
    src: (
      <>
        <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo" /> &amp;{" "}
        <SourceLink href="https://openaq.org/" label="OpenAQ" />
      </>
    ),
    d: "AQI, PM2.5, conditions, and monitoring stations.",
  },
  {
    t: "Data centers",
    src: <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker" />,
    d: "Proposed & operating sites, by status.",
  },
  {
    t: "Facilities & power",
    src: (
      <>
        <SourceLink href="https://www.epa.gov/frs" label="EPA FRS" /> &amp;{" "}
        <SourceLink href="https://www.openstreetmap.org/" label="OpenStreetMap" />
      </>
    ),
    d: "Regulated sites and power plants nearby.",
  },
];

const PRINCIPLES = [
  {
    t: "Transparent by default",
    d: (
      <>
        Every layer names its source so you can check it yourself. See the{" "}
        <Link href="/methodology" className="text-brand hover:text-brand-strong">methodology</Link>.
      </>
    ),
  },
  {
    t: "Free and open access",
    d: "The core map is free, with no account required to explore.",
  },
  {
    t: "Privacy-respecting",
    d: (
      <>
        We don&apos;t sell your data or track you across the web. Read our{" "}
        <Link href="/privacy" className="text-brand hover:text-brand-strong">privacy policy</Link>.
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />

      <div className="relative overflow-hidden">
        <HeroDecor variant="rings" />
        <div className={`${wrap} relative py-16`}>
        {/* Header */}
        <div className={eyebrow}>About Arounded</div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          A clearer view of what&apos;s around you
        </h1>
        <p className="text-lg opacity-85 leading-relaxed max-w-2xl">
          Arounded is a free, transparent map for understanding the environment around the places
          you care about — and how it changes over time. Wildfire smoke, air quality, heat, and
          nearby facilities, drawn from public data sources you can verify.
        </p>

        {/* Why it exists */}
        <section className={`${section} mt-6`}>
          <div className={eyebrow}>Why it exists</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">
            Context beats a single number
          </h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl">
            <p>
              Most tools show you a single number for right now. Real decisions — when to spend time
              outdoors, whether a neighborhood fits your family, what&apos;s being built nearby — need
              context over weeks and months, not just a snapshot.
            </p>
            <p>
              Arounded focuses on that context: consistent daily signals, clearly-sourced layers, and
              a{" "}
              <Link href="/changes" className="text-brand hover:text-brand-strong">change log</Link>{" "}
              so you can see what moved and when.
            </p>
          </div>
        </section>

        {/* What's on the map */}
        <section className={section}>
          <div className={eyebrow}>The layers</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">What&apos;s on the map</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-7">
            {LAYERS.map((l) => (
              <div key={l.t} className="border-t border-white/10 pt-4">
                <h3 className="font-semibold mb-1">{l.t}</h3>
                <div className="text-xs opacity-55 mb-1.5">{l.src}</div>
                <p className="text-sm opacity-75 leading-relaxed">{l.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className={section}>
          <div className={eyebrow}>What we stand for</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-8">Our principles</h2>
          <div className="divide-y divide-white/10 border-t border-white/10 max-w-2xl">
            {PRINCIPLES.map((p) => (
              <div key={p.t} className="grid sm:grid-cols-[220px_1fr] gap-1 sm:gap-6 py-5">
                <h3 className="font-semibold flex items-start gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-brand mt-1.5 shrink-0" />
                  {p.t}
                </h3>
                <p className="text-sm opacity-75 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer + CTA */}
        <div className="pt-10 border-t border-white/10">
          <p className="text-sm opacity-60 leading-relaxed max-w-2xl border-l-2 border-white/15 pl-4 mb-8">
            Arounded provides informational environmental signals. It is not medical advice and not an
            emergency alert system. For urgent health or safety decisions, use official local and
            federal guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/map"
              className="px-6 py-3 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors text-center"
            >
              Explore the map
            </Link>
            <Link
              href="/changes"
              className="px-6 py-3 border border-white/20 rounded-lg font-medium hover:border-brand/60 hover:text-brand transition-colors text-center"
            >
              See what&apos;s changed
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
