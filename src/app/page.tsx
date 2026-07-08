import Link from "next/link";
import Navigation from "@/src/components/Navigation";
import SourceLink from "@/src/components/SourceLink";
import Tooltip from "@/src/components/Tooltip";
import { Contours } from "@/src/components/Decor";

const eyebrow = "font-mono text-xs uppercase tracking-[0.16em] text-brand mb-3";
const wrap = "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8";

const STEPS = [
  {
    t: "Look up your street — or anywhere",
    d: "Type an address, ZIP, or city, or let the map find where you are.",
  },
  {
    t: "See what's around it",
    d: "Switch on data centers, facilities, power plants, air quality, and wildfire smoke.",
  },
  {
    t: "Tap anything to learn more",
    d: "Every point tells you what it is, its status, and where the data came from.",
  },
  {
    t: "Save it and watch it change",
    d: "With a free account, we track conditions daily and can email you when a new data center is proposed nearby.",
  },
  {
    t: "Share what you find",
    d: "Send a link to a neighbor or your group — it opens the map right where you left it.",
  },
];

const AUDIENCE = [
  { t: "Concerned residents", d: "Wondering whether a data center or industrial project is coming near them." },
  { t: "Movers & buyers", d: "Comparing neighborhoods or weighing a move." },
  { t: "Organizers & journalists", d: "Tracking facilities and infrastructure, with sources to cite." },
  { t: "Sensitive to air quality", d: "Keeping an eye on smoke, pollution, and heat day to day." },
  { t: "Outdoor planners", d: "Timing exercise, travel, and daily routines around the air." },
  { t: "Researchers & the curious", d: "Exploring how a place changes over weeks and months." },
];

const DC_STATUSES = [
  { c: "#ecab3f", l: "Proposed", d: "Announced, in permitting, or awaiting approval — the stage you can still weigh in on." },
  { c: "#cf7d4a", l: "Under construction", d: "Approved or actively being built." },
  { c: "#b7a582", l: "Operating", d: "Up and running today." },
  { c: "#7c766c", l: "Cancelled", d: "Withdrawn or blocked." },
];

const FAQS = [
  {
    q: "Is a data center being built near me?",
    a: (
      <>
        Search your address and turn on the Data centers layer. You&apos;ll see sites near you
        color-coded by status — operating, under construction, or proposed — with the operator and
        power use where we have them. Save your place and we&apos;ll let you know when a new one shows up.
      </>
    ),
  },
  {
    q: "Where does the data come from?",
    a: (
      <>
        Public and open sources, and we name every one so you can check it yourself —{" "}
        <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker" /> for data centers,{" "}
        <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" /> for smoke,{" "}
        <SourceLink href="https://open-meteo.com/en/docs" label="Open-Meteo" /> for air and weather, and{" "}
        <SourceLink href="https://www.epa.gov/frs" label="EPA" /> for facilities. See the{" "}
        <Link href="/methodology" className="text-brand hover:text-brand-strong">methodology</Link> for the full list.
      </>
    ),
  },
  {
    q: "How often does it update?",
    a: (
      <>
        Smoke refreshes daily and the data-center tracker weekly. For your saved places, we log
        conditions once a day so the history stays consistent. Live values can change fast — for
        anything urgent, follow your official local alerts.
      </>
    ),
  },
  {
    q: 'What’s a "smoke day"?',
    a: (
      <>
        A day when a <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA" /> satellite
        smoke plume passed over your saved place. It&apos;s a steady way to spot patterns over time — not a
        measure of what you actually breathed indoors.
      </>
    ),
  },
  {
    q: "Do I need an account? Is it free?",
    a: (
      <>
        The map is free and open to everyone — no account needed to explore. Sign in only if you want
        to save places, see their history, and get alerts. That part&apos;s free too.
      </>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Decorative "around a point" rings + glow */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-40 right-[-10%] w-[680px] h-[680px] rounded-full opacity-[0.10]"
            style={{ background: "radial-gradient(circle, var(--color-brand) 0%, transparent 62%)" }}
          />
          <svg
            className="absolute right-[-14%] top-1/2 -translate-y-1/2 w-[560px] h-[560px] hidden md:block opacity-[0.14]"
            viewBox="0 0 200 200"
            fill="none"
          >
            {[26, 50, 74, 98].map((r) => (
              <circle key={r} cx="100" cy="100" r={r} stroke="var(--color-brand)" strokeWidth="0.5" />
            ))}
            <circle cx="100" cy="100" r="4.5" fill="var(--color-brand)" />
          </svg>
        </div>

        <div className={`${wrap} relative py-24 lg:py-32`}>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-xs font-mono uppercase tracking-wider text-brand mb-6">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand" />
              What&apos;s nearby · How it&apos;s changing · Sources you can check
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-[1.03] tracking-tight">
              See what&apos;s moving in <span className="text-brand">around you</span>.
            </h1>

            <p className="text-xl opacity-80 mb-8 leading-relaxed max-w-2xl">
              A free, transparent map of what surrounds the places you care about — data centers,
              industrial facilities, power plants, pollution, and wildfire smoke — and how it changes
              over time.
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

            <p className="text-sm opacity-55 mt-4">
              No account needed to browse. Sign in to save places and track how they change over time.
            </p>
          </div>
        </div>
      </section>

      {/* How it works — editorial numbered list, no cards */}
      <section className={`${wrap} py-20 border-t border-white/10`}>
        <div className="max-w-3xl">
          <div className={eyebrow}>How it works</div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-12">
            From your address to the full picture
          </h2>

          <ol className="space-y-10">
            {STEPS.map((step, i) => (
              <li key={step.t} className="flex gap-5 sm:gap-7">
                <div className="font-mono text-2xl font-semibold text-brand/70 w-8 shrink-0 pt-0.5 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">{step.t}</h3>
                  <p className="opacity-70 leading-relaxed">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-12 text-sm opacity-60 leading-relaxed border-l-2 border-white/15 pl-4">
            Arounded is for understanding and spotting patterns over time. In an emergency, always
            follow your official local alerts first.
          </p>
        </div>
      </section>

      {/* Who it's for — light grid, no boxes */}
      <section className={`${wrap} py-20 border-t border-white/10`}>
        <div className={eyebrow}>Made for</div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Who it&apos;s for</h2>
        <p className="opacity-65 mb-12 max-w-2xl">
          Anyone trying to understand their surroundings — especially when something new shows up.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
          {AUDIENCE.map((x) => (
            <div key={x.t}>
              <div className="flex items-center gap-2 font-medium mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-brand shrink-0" />
                {x.t}
              </div>
              <p className="text-sm opacity-65 leading-relaxed pl-4">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you get — one panel, split, not two cards */}
      <section className={`${wrap} py-20 border-t border-white/10`}>
        <div className={eyebrow}>What you get</div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-12">
          Free to explore, free to save
        </h2>

        <div className="rounded-2xl border border-white/10 grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 max-w-4xl overflow-hidden">
          <div className="p-8">
            <h3 className="font-semibold text-lg mb-5">Free, always</h3>
            <ul className="space-y-3 text-sm opacity-90">
              {[
                "Explore any place and every public layer",
                "Check current air, weather, and what's nearby",
                "Share a map link with anyone",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="text-brand mt-px">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-8 bg-brand/[0.04]">
            <h3 className="font-semibold text-lg mb-5">With a free account</h3>
            <ul className="space-y-3 text-sm opacity-90">
              {[
                "Save your places — home, work, school, wherever",
                "See 90 days of history and trends, tracked for you",
                "Get alerts when a data center is proposed nearby",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="text-brand mt-px">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs opacity-55 leading-relaxed">
              Signing in just keeps your places with you across devices. No profile, no feed, no noise.
            </p>
          </div>
        </div>
      </section>

      {/* Transparency & sources — editorial, hairline-separated */}
      <section className={`${wrap} py-20 border-t border-white/10`}>
        <div className={eyebrow}>Transparency</div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">No black boxes</h2>
        <p className="opacity-70 leading-relaxed max-w-2xl mb-12">
          Every layer names its source, so you never have to take our word for it. We don&apos;t sell
          your data, and we don&apos;t track you around the web.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-9">
          <div className="border-t border-white/10 pt-5">
            <h3 className="font-semibold mb-1">Data centers</h3>
            <div className="text-xs opacity-55 mb-2">
              <SourceLink href="https://www.fractracker.org/data-centers/" label="FracTracker Alliance" />
            </div>
            <p className="text-sm opacity-75 leading-relaxed">
              Near you, with operator, power demand, and cooling where available — color-coded by
              status. Refreshed weekly.
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-xs opacity-90">
              {DC_STATUSES.map((s) => (
                <Tooltip key={s.l} content={s.d}>
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.c }} />
                  {s.l}
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-5">
            <h3 className="font-semibold mb-1">Wildfire smoke</h3>
            <div className="text-xs opacity-55 mb-2">
              <SourceLink href="https://www.ospo.noaa.gov/Products/land/hms.html" label="NOAA HMS Smoke Product" />
            </div>
            <p className="text-sm opacity-75 leading-relaxed">
              Daily satellite smoke plumes, used to build your saved places&apos; &quot;smoke day&quot; history.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <h3 className="font-semibold mb-1">Air quality &amp; weather</h3>
            <div className="text-xs opacity-55 mb-2">
              <SourceLink href="https://open-meteo.com/en/docs/air-quality-api" label="Open-Meteo" />
            </div>
            <p className="text-sm opacity-75 leading-relaxed">
              <Tooltip content="Air Quality Index — a 0–500 scale where higher means worse air.">
                <span className="underline decoration-dotted decoration-white/40 underline-offset-2">AQI</span>
              </Tooltip>{" "}
              and{" "}
              <Tooltip content="Fine particle pollution (2.5 microns) — the stuff in smoke and haze that reaches your lungs.">
                <span className="underline decoration-dotted decoration-white/40 underline-offset-2">PM2.5</span>
              </Tooltip>
              , plus daily temperatures. Logged daily for your saved places.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <h3 className="font-semibold mb-1">EPA facilities</h3>
            <div className="text-xs opacity-55 mb-2">
              <SourceLink href="https://www.epa.gov/frs" label="EPA Facility Registry Service" />
            </div>
            <p className="text-sm opacity-75 leading-relaxed">
              Regulated facilities, pulled on demand for the area you&apos;re viewing.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <h3 className="font-semibold mb-1">Power plants</h3>
            <div className="text-xs opacity-55 mb-2">
              <SourceLink href="https://www.openstreetmap.org/" label="OpenStreetMap" />
            </div>
            <p className="text-sm opacity-75 leading-relaxed">
              Power generation sites, with fuel and capacity where they&apos;re tagged.
            </p>
          </div>

          <div className="border-t border-white/10 pt-5">
            <h3 className="font-semibold mb-1">Air-quality stations</h3>
            <div className="text-xs opacity-55 mb-2">
              <SourceLink href="https://openaq.org/" label="OpenAQ" />
            </div>
            <p className="text-sm opacity-75 leading-relaxed">
              Real-world monitoring stations, alongside the modeled air-quality values.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <Link
            href="/methodology"
            className="text-brand hover:text-brand-strong transition-colors inline-flex items-center gap-1"
          >
            See our full sources &amp; methods →
          </Link>
        </div>
      </section>

      {/* FAQ — clean divided list */}
      <section className={`${wrap} py-20 border-t border-white/10`}>
        <div className="grid lg:grid-cols-[280px_1fr] gap-10">
          <div>
            <div className={eyebrow}>Good to know</div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Common questions</h2>
          </div>

          <div className="divide-y divide-white/10 border-t border-white/10">
            {FAQS.map((f) => (
              <div key={f.q} className="py-6 first:pt-0">
                <h3 className="font-semibold mb-2">{f.q}</h3>
                <p className="opacity-70 text-sm leading-relaxed max-w-2xl">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className={`${wrap} py-20 border-t border-white/10`}>
        <div className="relative overflow-hidden rounded-3xl border border-brand/25 bg-brand/[0.06] p-10 sm:p-16 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(circle at 50% 120%, var(--color-brand) 0%, transparent 55%)", opacity: 0.1 }}
          />
          <Contours
            className="pointer-events-none absolute inset-x-0 bottom-0 h-44 w-full"
            opacity={0.22}
          />
          <h2 className="relative text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
            See what&apos;s around your place.
          </h2>
          <p className="relative opacity-75 max-w-xl mx-auto mb-8">
            It&apos;s free, and you don&apos;t need an account to start. Search your address and turn on the
            layers that matter to you.
          </p>
          <div className="relative flex flex-col sm:flex-row gap-4 justify-center">
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
        <div className={`${wrap} py-12`}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm opacity-60">
              <span className="inline-block w-2 h-2 rounded-full bg-brand" />
              © {new Date().getFullYear()} Arounded
            </div>

            <div className="flex gap-6 text-sm">
              <Link href="/about" className="opacity-60 hover:opacity-100 transition-opacity">About</Link>
              <Link href="/changes" className="opacity-60 hover:opacity-100 transition-opacity">Changes</Link>
              <Link href="/methodology" className="opacity-60 hover:opacity-100 transition-opacity">Methodology</Link>
              <Link href="/privacy" className="opacity-60 hover:opacity-100 transition-opacity">Privacy</Link>
            </div>
          </div>

          <div className="mt-6 text-xs opacity-45 max-w-3xl leading-relaxed">
            Arounded is here to help you understand your surroundings. It isn&apos;t medical advice or an
            emergency alert system — for urgent health or safety decisions, follow official local and
            federal guidance.
          </div>
        </div>
      </footer>
    </div>
  );
}
