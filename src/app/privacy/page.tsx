import Link from "next/link";
import Navigation from "@/src/components/Navigation";

const eyebrow = "font-mono text-xs uppercase tracking-[0.16em] text-brand mb-3";
const wrap = "max-w-3xl mx-auto px-4 sm:px-6 lg:px-8";
const section = "py-14 border-t border-white/10";
const LAST_UPDATED = "January 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />

      <div className={`${wrap} py-16`}>
        {/* Header */}
        <div className={eyebrow}>Privacy</div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          Useful without being invasive
        </h1>
        <p className="text-sm opacity-55">Last updated: {LAST_UPDATED}</p>

        {/* Intro */}
        <div className="mt-10 max-w-2xl">
          <p className="text-lg opacity-85 leading-relaxed">
            You can explore the map without an account. If you choose to sign in, we store only
            what&apos;s needed to save places and track history.
          </p>
          <p className="mt-4 text-sm opacity-60 leading-relaxed border-l-2 border-white/15 pl-4">
            This is a plain-language privacy statement for the MVP. As features expand, we&apos;ll
            update it — and we&apos;ll keep changes easy to understand.
          </p>
        </div>

        {/* Data without login */}
        <section className={`${section} mt-4`}>
          <div className={eyebrow}>Browsing</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">
            Data collected without login
          </h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>
              You can use Arounded without creating an account. When you browse the map without
              logging in, we do not ask for personal details like your name, phone number, or address.
            </p>
            <p>We do not currently run behavioral analytics or advertising trackers.</p>
            <p>
              When you search or navigate the map, requests are processed to load map tiles and fetch
              environmental data. We do not intentionally store your searches as a personal history
              when you&apos;re browsing without an account.
            </p>
          </div>
        </section>

        {/* Data with login */}
        <section className={section}>
          <div className={eyebrow}>With an account</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Data stored with login</h2>
          <p className="opacity-80 leading-relaxed max-w-2xl text-[15px] mb-5">When you create an account, we store:</p>
          <dl className="divide-y divide-white/10 border-t border-white/10 max-w-2xl">
            {[
              { t: "Email address", d: "Used for authentication and account access." },
              { t: "Saved places", d: "Places you explicitly save (label + coordinates)." },
              { t: "Preference settings", d: "Things like display/layer preferences (if enabled)." },
              { t: "History logs", d: "Daily condition history tied to saved places (smoke presence, basic air quality, and daily conditions)." },
            ].map((row) => (
              <div key={row.t} className="grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-6 py-4">
                <dt className="font-semibold text-sm">{row.t}</dt>
                <dd className="text-sm opacity-75 leading-relaxed">{row.d}</dd>
              </div>
            ))}
          </dl>
          <p className="opacity-80 leading-relaxed max-w-2xl text-[15px] mt-5">
            We use this data to power your experience (saved locations and history). We do not sell it.
          </p>
          <p className="text-xs opacity-55 mt-3 max-w-2xl">
            Email: we don&apos;t send marketing emails by default. If that changes later, it will be opt-in.
          </p>
        </section>

        {/* What we don't store */}
        <section className={section}>
          <div className={eyebrow}>Off-limits</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">What we don&apos;t store</h2>
          <p className="opacity-80 leading-relaxed max-w-2xl text-[15px] mb-4">
            We do not track your precise, continuous location. If you search for a location on the map,
            it&apos;s used to display results — and it&apos;s only stored if you explicitly save it.
          </p>
          <p className="opacity-80 leading-relaxed max-w-2xl text-[15px] mb-4">We do not collect or store:</p>
          <ul className="divide-y divide-white/10 border-t border-white/10 max-w-2xl text-sm">
            {[
              "Your device's continuous GPS trail",
              "Real-time background location tracking",
              "Advertising profiles or third-party tracking cookies",
              "Personal details beyond what you provide for account access",
            ].map((t) => (
              <li key={t} className="py-3 opacity-80">{t}</li>
            ))}
          </ul>
          <p className="text-xs opacity-55 mt-4 max-w-2xl">
            If we ever add features that use device location automatically, it will be optional and opt-in.
          </p>
        </section>

        {/* Third parties */}
        <section className={section}>
          <div className={eyebrow}>Services we use</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Third-party services</h2>
          <p className="opacity-80 leading-relaxed max-w-2xl text-[15px] mb-5">
            Arounded relies on a small set of services to operate:
          </p>
          <dl className="divide-y divide-white/10 border-t border-white/10 max-w-2xl">
            {[
              { t: "Supabase", d: "Authentication + database storage for accounts/saved places." },
              { t: "Mapbox", d: "Map tiles + geocoding/search." },
              { t: "Open-Meteo", d: "Air quality + weather data endpoints." },
              { t: "NOAA / EPA", d: "Public datasets used for layers (smoke, facilities)." },
            ].map((row) => (
              <div key={row.t} className="grid sm:grid-cols-[200px_1fr] gap-1 sm:gap-6 py-4">
                <dt className="font-semibold text-sm">{row.t}</dt>
                <dd className="text-sm opacity-75 leading-relaxed">{row.d}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs opacity-55 mt-4 max-w-2xl">
            These services may process technical information (like IP address) as part of normal web
            requests. Arounded does not use them for ad targeting.
          </p>
        </section>

        {/* Cookies */}
        <section className={section}>
          <div className={eyebrow}>Essentials only</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Cookies &amp; local storage</h2>
          <p className="opacity-80 leading-relaxed max-w-2xl text-[15px]">
            Arounded does not use advertising cookies. However, certain services (like map rendering
            and authentication) may use essential cookies or local storage to function properly.
          </p>
        </section>

        {/* Retention */}
        <section className={section}>
          <div className={eyebrow}>How long we keep it</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Data retention</h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>
              We keep account data for as long as your account is active. If you delete your account,
              we delete your saved places and associated history.
            </p>
            <p>
              If account deletion isn&apos;t available in-product yet, you can request deletion by emailing us.
            </p>
            <p className="text-xs opacity-55">
              We may retain limited aggregated, anonymized data for reliability and maintenance, but it
              will not contain personally identifying information.
            </p>
          </div>
        </section>

        {/* Security */}
        <section className={section}>
          <div className={eyebrow}>Protection</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Security</h2>
          <div className="space-y-4 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>
              We use industry-standard practices to protect your data (encryption in transit, controlled
              access, and secure storage through our infrastructure providers).
            </p>
            <p className="text-sm opacity-70">
              No online service can guarantee absolute security, but we&apos;re intentional about minimizing
              what we store and protecting what we do.
            </p>
          </div>
        </section>

        {/* Rights */}
        <section className={section}>
          <div className={eyebrow}>You&apos;re in control</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">Your choices</h2>
          <p className="opacity-80 leading-relaxed max-w-2xl text-[15px] mb-4">You can:</p>
          <ul className="divide-y divide-white/10 border-t border-white/10 max-w-2xl text-sm">
            {[
              "Use Arounded without an account",
              "View, edit, or remove saved places",
              "Request account deletion",
              "Request a copy/export of your saved places (MVP: by request)",
            ].map((t) => (
              <li key={t} className="py-3 opacity-80">{t}</li>
            ))}
          </ul>
          <p className="text-sm opacity-60 mt-4">For requests, contact us below.</p>
        </section>

        {/* Contact */}
        <section className={section}>
          <div className={eyebrow}>Reach us</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">Contact</h2>
          <div className="space-y-3 opacity-80 leading-relaxed max-w-2xl text-[15px]">
            <p>If you have questions about privacy or data handling, email:</p>
            <p>
              <strong>Email:</strong>{" "}
              <a href="mailto:privacy@arounded.com" className="text-brand hover:text-brand-strong">
                privacy@arounded.com
              </a>
            </p>
            <p className="text-xs opacity-55">
              (Tip: you can also change this to a domain email you actually control, like
              privacy@kamalacreated.com, if that&apos;s easier right now.)
            </p>
          </div>
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
