"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navigation from "@/src/components/Navigation";
import Footer from "@/src/components/Footer";
import { geocodeForward } from "@/lib/conditions";

const WRAP = "max-w-6xl mx-auto px-6";

export default function Home() {
  const router = useRouter();
  const [addr, setAddr] = useState("");
  const [busy, setBusy] = useState(false);

  const lookUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = addr.trim();
    if (!q) return router.push("/near");
    setBusy(true);
    try {
      const hits = await geocodeForward(q);
      const h = hits[0];
      if (h) {
        router.push(`/near?a=${h.center[1].toFixed(4)},${h.center[0].toFixed(4)},${encodeURIComponent(h.place_name)}`);
      } else router.push("/near");
    } catch {
      router.push("/near");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ground text-ink">
      <style>{`
        .hl{background:var(--color-brand);color:var(--color-brand-ink);padding:0 .1em;box-decoration-break:clone;-webkit-box-decoration-break:clone}
        .stamp{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.09em;border:2px solid var(--color-flame);color:var(--color-flame);padding:6px 11px;font-weight:700;display:inline-block}
        .eyb{font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:var(--color-flame);font-weight:700}
        .flamebtn{background:var(--color-flame);color:#141210}
      `}</style>
      <Navigation />

      {/* HERO */}
      <section className={`${WRAP} pt-14 pb-8`}>
        <span className="stamp" style={{ transform: "rotate(-1.5deg)" }}>Free · No login to look</span>
        <h1 className="font-display font-black uppercase mt-7 leading-[0.85] tracking-tight text-[clamp(3rem,10vw,7rem)] max-w-[15ch]">
          Know what&apos;s <span className="hl">going up</span> <span className="text-flame">around you.</span>
        </h1>
        <p className="mt-7 text-lg sm:text-xl max-w-[48ch] font-medium text-ink-soft">
          Data centers, power lines, new construction, the air itself — and the local votes that decide
          them. In plain language, every source named.
        </p>

        <form onSubmit={lookUp} className="mt-8 flex gap-2 max-w-lg">
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="Enter your address, town, or ZIP"
            aria-label="Address"
            className="flex-1 bg-surface border-2 border-ink rounded-md px-4 py-3 text-base outline-none placeholder:text-ink-faint focus:border-brand transition-colors"
          />
          <button type="submit" disabled={busy} className="flamebtn font-display font-extrabold uppercase text-xl tracking-wide px-6 rounded-md disabled:opacity-60">
            {busy ? "…" : "Look up"}
          </button>
        </form>

        {/* bold data cards */}
        <div className="grid sm:grid-cols-3 gap-3 mt-9">
          <div className="rounded-md p-5" style={{ background: "var(--color-brand)", color: "var(--color-brand-ink)" }}>
            <div className="font-display font-extrabold uppercase text-2xl leading-none">Moratorium vote</div>
            <div className="font-mono text-[11px] tracking-wide mt-2 opacity-90">SEP 15 · IN 9 DAYS</div>
            <div className="text-sm mt-2 opacity-95">The county-wide &quot;press pause&quot; on new data centers.</div>
          </div>
          <div className="rounded-md p-5 flamebtn">
            <div className="font-display font-extrabold uppercase text-2xl leading-none">Quantum Park</div>
            <div className="font-mono text-[11px] tracking-wide mt-2 opacity-80">OCT 20 · 2.4 MI</div>
            <div className="text-sm mt-2">More servers proposed at the Verizon campus.</div>
          </div>
          <div className="rounded-md p-5 bg-surface border-2 border-ink">
            <div className="font-display font-extrabold uppercase text-2xl leading-none">Your block</div>
            <div className="font-mono text-[11px] tracking-wide mt-2 text-ink-faint">39.11, -77.56</div>
            <div className="text-sm mt-2 text-ink-soft">3 proposed · 11 operating within 5 miles.</div>
          </div>
        </div>
        <p className="mt-5 text-sm text-ink-faint">Real facts around a place — every source named, not a black-box risk score.</p>
      </section>

      {/* WHAT YOU CAN SEE */}
      <section className={`${WRAP} py-14 border-t-2 border-ink`}>
        <span className="eyb">What you can see</span>
        <h2 className="font-display font-black uppercase text-[clamp(2rem,5vw,3.2rem)] leading-[0.9] mt-3 max-w-[20ch]">
          Your whole area — not just the listing.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px mt-8 bg-line border-2 border-ink">
          {[
            { t: "Data centers", d: "Operating, under construction, and proposed — what could still be stopped.", c: "var(--color-flame)" },
            { t: "Power & industry", d: "Substations, plants, and the infrastructure that follows the servers.", c: "var(--color-honey)" },
            { t: "Air & smoke", d: "Live air quality and wildfire smoke, in plain numbers. No login wall.", c: "var(--color-sky)" },
            { t: "Local decisions", d: "The hearings and votes that decide what gets built — with dates.", c: "var(--color-brand)" },
          ].map((l) => (
            <div key={l.t} className="bg-ground p-5">
              <div className="w-8 h-8 rounded-sm mb-4" style={{ background: l.c }} />
              <h3 className="font-display font-extrabold uppercase text-xl leading-none">{l.t}</h3>
              <p className="text-sm text-ink-soft mt-2 leading-snug">{l.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DECISIONS */}
      <section className={`${WRAP} py-14 border-t-2 border-ink`}>
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <span className="eyb">The part nobody else does</span>
            <h2 className="font-display font-black uppercase text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[0.88] mt-3">
              Catch it before it&apos;s decided.
            </h2>
            <p className="mt-5 text-lg text-ink-soft max-w-[46ch]">
              Most people find out about the thing next door once the cranes arrive. Save a place, and we
              tell you when a decision is coming near it — while the comment window&apos;s still open.
            </p>
            <p className="mt-3.5 text-lg text-ink-soft max-w-[46ch]">
              Pulled from the county&apos;s own calendar and agendas, so you don&apos;t have to read them.
            </p>
            <Link href="/decisions" className="flamebtn inline-block mt-7 font-display font-extrabold uppercase text-lg tracking-wide px-6 py-3 rounded-md">
              See decisions near you →
            </Link>
          </div>
          <div className="border-2 border-ink rounded-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink bg-ink" style={{ color: "var(--color-ground)" }}>
              <span className="font-mono text-[11px] uppercase tracking-wide">Upcoming near your saved places</span>
              <span className="font-mono text-[11px] uppercase tracking-wide opacity-70">Loudoun</span>
            </div>
            {[
              { d: "15", m: "SEP", t: "Vote on a data-center moratorium", meta: "Board of Supervisors · county-wide “press pause”", c: "var(--color-flame)" },
              { d: "20", m: "OCT", t: "Quantum Park data centers — Waxpool Rd", meta: "Board decides on more servers at the Verizon campus", c: "var(--color-brand)" },
              { d: "22", m: "OCT", t: "Planning Commission public hearing", meta: "Agenda includes a special-exception application", c: "var(--color-ink-faint)" },
            ].map((e, i) => (
              <div key={i} className="flex gap-4 px-4 py-4 border-b border-line last:border-b-0">
                <div className="font-display font-extrabold text-center w-12 shrink-0 leading-none" style={{ color: e.c }}>
                  <div className="text-3xl">{e.d}</div>
                  <div className="font-mono text-[10px] mt-1 tracking-wide">{e.m}</div>
                </div>
                <div>
                  <div className="font-semibold leading-snug">{e.t}</div>
                  <div className="text-sm text-ink-soft mt-0.5">{e.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className={`${WRAP} py-14 border-t-2 border-ink`}>
        <span className="eyb">Who it&apos;s for</span>
        <h2 className="font-display font-black uppercase text-[clamp(2rem,5vw,3.2rem)] leading-[0.9] mt-3">
          Everyone who lives somewhere.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {[
            { t: "Neighbors", d: "Find out what's proposed down the road before it's a done deal." },
            { t: "Movers & buyers", d: "Know what's really around an address before you sign." },
            { t: "Parents", d: "Watch the air and what's built near home, school, and play." },
            { t: "Organizers", d: "Timely, sourced evidence you can share in one link." },
          ].map((a) => (
            <div key={a.t} className="border-t-2 border-ink pt-3">
              <h3 className="font-display font-extrabold uppercase text-xl leading-none">{a.t}</h3>
              <p className="text-sm text-ink-soft mt-2">{a.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={`${WRAP} py-14 border-t-2 border-ink`}>
        <span className="eyb">How it works</span>
        <h2 className="font-display font-black uppercase text-[clamp(2rem,5vw,3.2rem)] leading-[0.9] mt-3">
          Three steps, and it watches for you.
        </h2>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          {[
            { n: "1", t: "Look up a place", d: "Type any address. See what's around it — proposed and operating — every source named." },
            { n: "2", t: "Save it", d: "Keep the places you care about: home, your parents', a school, a spot you're weighing." },
            { n: "3", t: "Get told in time", d: "We watch the county calendar and ping you before a nearby decision, while comments are open." },
          ].map((s) => (
            <div key={s.n}>
              <div className="font-display font-black text-6xl leading-none text-brand">{s.n}</div>
              <h3 className="font-display font-extrabold uppercase text-xl leading-none mt-3">{s.t}</h3>
              <p className="text-sm text-ink-soft mt-2 max-w-[34ch]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className={`${WRAP} py-16 border-t-2 border-ink`}>
        <div className="border-2 border-ink rounded-md p-8 sm:p-12 text-center bg-surface">
          <span className="eyb">Why you can trust it</span>
          <h2 className="font-display font-black uppercase text-[clamp(2rem,5.5vw,3.4rem)] leading-[0.9] mt-3 max-w-[20ch] mx-auto">
            No scores. No spin. Just what&apos;s actually there.
          </h2>
          <p className="mt-4 text-ink-soft max-w-[52ch] mx-auto">
            Other tools hand you a mysterious &quot;risk number.&quot; We show you the real facilities and the
            real applications, link you to where each came from, and let you decide.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-7 font-mono text-[12px] uppercase tracking-wide">
            <span className="border-2 border-ink rounded px-3 py-2">Facts, not a score</span>
            <span className="border-2 border-ink rounded px-3 py-2">Every source named</span>
            <span className="border-2 border-ink rounded px-3 py-2">Free — no login to look</span>
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className={`${WRAP} py-20 text-center`}>
        <h2 className="font-display font-black uppercase text-[clamp(2.6rem,8vw,5rem)] leading-[0.86]">
          What&apos;s around <span className="text-flame">your place?</span>
        </h2>
        <p className="mt-5 text-ink-soft max-w-[44ch] mx-auto text-lg">
          Take a look — it&apos;s free, and you might be surprised what&apos;s within five miles.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          <Link href="/near" className="flamebtn font-display font-extrabold uppercase text-xl tracking-wide px-7 py-3.5 rounded-md">
            Look up my address →
          </Link>
          <Link href="/map" className="font-display font-extrabold uppercase text-xl tracking-wide px-7 py-3.5 rounded-md border-2 border-ink hover:bg-ink hover:text-[color:var(--color-ground)] transition-colors">
            Explore the map
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
