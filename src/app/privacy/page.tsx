import Link from "next/link";
import Navigation from "@/src/components/Navigation";

const LAST_UPDATED = "January 2026";
const card = "border border-white/10 rounded-xl p-6 bg-white/5";
const callout = "border border-white/15 rounded-xl p-6 bg-white/5";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ground text-white">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-3">Privacy</h1>
            <p className="text-sm opacity-60">Last updated: {LAST_UPDATED}</p>
          </div>

          {/* Intro */}
          <section className="mb-12">
            <div className={callout}>
              <p className="opacity-90 leading-relaxed">
                Arounded is built to be useful without being invasive. You can explore the map
                without an account. If you choose to sign in, we store only what’s needed to save
                places and track history.
              </p>
              <p className="text-sm opacity-70 mt-3">
                This is a plain-language privacy statement for the MVP. As features expand, we’ll
                update it — and we’ll keep changes easy to understand.
              </p>
            </div>
          </section>

          {/* Data without login */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Data collected without login</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  You can use Arounded without creating an account. When you browse the map without
                  logging in, we do not ask for personal details like your name, phone number, or address.
                </p>
                <p>
                  We do not currently run behavioral analytics or advertising trackers.
                </p>
                <p>
                  When you search or navigate the map, requests are processed to load map tiles and fetch
                  environmental data. We do not intentionally store your searches as a personal history
                  when you’re browsing without an account.
                </p>
              </div>
            </div>
          </section>

          {/* Data with login */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Data stored with login</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>When you create an account, we store:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    <strong>Email address:</strong> used for authentication and account access
                  </li>
                  <li>
                    <strong>Saved places:</strong> places you explicitly save (label + coordinates)
                  </li>
                  <li>
                    <strong>Preference settings:</strong> things like display/layer preferences (if enabled)
                  </li>
                  <li>
                    <strong>History logs:</strong> daily condition history tied to saved places (smoke presence,
                    basic air quality, and daily conditions)
                  </li>
                </ul>

                <p className="mt-3">
                  We use this data to power your experience (saved locations and history). We do not sell it.
                </p>

                <p className="text-xs opacity-60">
                  Email: We don’t send marketing emails by default. If that changes later, it will be opt-in.
                </p>
              </div>
            </div>
          </section>

          {/* What we don't store */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">What we don’t store</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  We do not track your precise, continuous location. If you search for a location on the map,
                  it’s used to display results — and it’s only stored if you explicitly save it.
                </p>

                <p>We do not collect or store:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Your device’s continuous GPS trail</li>
                  <li>Real-time background location tracking</li>
                  <li>Advertising profiles or third-party tracking cookies</li>
                  <li>Personal details beyond what you provide for account access</li>
                </ul>

                <p className="text-xs opacity-60 mt-3">
                  If we ever add features that use device location automatically, it will be optional and opt-in.
                </p>
              </div>
            </div>
          </section>

          {/* Third parties */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Third-party services</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  Arounded relies on a small set of services to operate:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Supabase:</strong> authentication + database storage for accounts/saved places</li>
                  <li><strong>Mapbox:</strong> map tiles + geocoding/search</li>
                  <li><strong>Open-Meteo:</strong> air quality + weather data endpoints</li>
                  <li><strong>NOAA / EPA:</strong> public datasets used for layers (smoke, facilities)</li>
                </ul>
                <p className="text-xs opacity-60">
                  These services may process technical information (like IP address) as part of normal web requests.
                  Arounded does not use them for ad targeting.
                </p>
              </div>
            </div>
          </section>

          {/* Cookies / local storage */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Cookies & local storage</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  Arounded does not use advertising cookies. However, certain services (like map rendering
                  and authentication) may use essential cookies or local storage to function properly.
                </p>
              </div>
            </div>
          </section>

          {/* Retention */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Data retention</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>
                  We keep account data for as long as your account is active. If you delete your account,
                  we delete your saved places and associated history.
                </p>
                <p>
                  If account deletion isn’t available in-product yet, you can request deletion by emailing us.
                </p>
                <p className="text-xs opacity-60">
                  We may retain limited aggregated, anonymized data for reliability and maintenance, but it will not
                  contain personally identifying information.
                </p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Security</h2>
            <div className="space-y-3 opacity-90 leading-relaxed">
              <p>
                We use industry-standard practices to protect your data (encryption in transit, controlled access,
                and secure storage through our infrastructure providers).
              </p>
              <p className="text-sm opacity-70">
                No online service can guarantee absolute security, but we’re intentional about minimizing what we store
                and protecting what we do.
              </p>
            </div>
          </section>

          {/* Rights */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Your choices</h2>
            <div className="space-y-3 opacity-90 leading-relaxed">
              <p>You can:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use Arounded without an account</li>
                <li>View, edit, or remove saved places</li>
                <li>Request account deletion</li>
                <li>Request a copy/export of your saved places (MVP: by request)</li>
              </ul>
              <p className="mt-3 text-sm opacity-70">
                For requests, contact us below.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Contact</h2>
            <div className={card}>
              <div className="space-y-3 opacity-90 leading-relaxed text-sm">
                <p>If you have questions about privacy or data handling, email:</p>
                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:privacy@arounded.com"
                    className="underline hover:opacity-80"
                  >
                    privacy@arounded.com
                  </a>
                </p>
                <p className="text-xs opacity-60">
                  (Tip: you can also change this to a domain email you actually control, like privacy@kamalacreated.com,
                  if that’s easier right now.)
                </p>
              </div>
            </div>
          </section>

          {/* Back to Map */}
          <div className="pt-8 border-t border-white/10">
            <Link
              href="/map"
              className="inline-block px-6 py-3 bg-brand text-brand-ink rounded-lg font-medium hover:bg-brand-strong transition-colors"
            >
              Explore the map
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}