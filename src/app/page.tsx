"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navigation from "@/src/components/Navigation";
import Footer from "@/src/components/Footer";
import { geocodeForward } from "@/lib/conditions";

const WRAP = "max-w-6xl mx-auto px-6";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.14em] text-brand-strong">
      <span className="ring-eyebrow" aria-hidden="true" />
      {children}
    </span>
  );
}

export default function Home() {
  const router = useRouter();
  const [addr, setAddr] = useState("");
  const [busy, setBusy] = useState(false);

  const lookUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = addr.trim();
    if (!q) {
      router.push("/near");
      return;
    }
    setBusy(true);
    try {
      const hits = await geocodeForward(q);
      const h = hits[0];
      if (h) {
        const enc = `${h.center[1].toFixed(4)},${h.center[0].toFixed(4)},${encodeURIComponent(h.place_name)}`;
        router.push(`/near?a=${enc}`);
      } else {
        router.push("/near");
      }
    } catch {
      router.push("/near");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ground text-ink">
      <style>{`.ring-eyebrow{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--color-brand);position:relative}.ring-eyebrow::after{content:"";position:absolute;inset:3px;border-radius:50%;background:var(--color-brand)}`}</style>
      <Navigation />

      {/* HERO */}
      <section className={`${WRAP} pt-16 pb-10`}>
        <div className="grid lg:grid-cols-[1.05fr_.95fr] gap-14 items-center">
          <div>
            <Eyebrow>Civic transparency, for your block</Eyebrow>
            <h1 className="mt-5 font-bold leading-[1.03] tracking-tight text-[clamp(2.7rem,6vw,4.1rem)]">
              Know what&apos;s<br />
              <span className="text-brand">around you.</span>
            </h1>
            <p className="mt-6 text-lg text-ink-soft max-w-[34ch] leading-relaxed">
              The places we live are changing fast — data centers, power lines, new construction,
              the air itself. See what&apos;s really around any address, what&apos;s proposed next
              door, and the local decisions that will change it.
            </p>
            <form onSubmit={lookUp} className="mt-8 flex gap-2 max-w-md">
              <div className="flex-1 flex items-center gap-2.5 bg-surface border border-line rounded-xl px-3.5 shadow-sm">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2" className="shrink-0">
                  <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <input
                  value={addr}
                  onChange={(e) => setAddr(e.target.value)}
                  placeholder="Enter your address, town, or ZIP"
                  aria-label="Address"
                  className="w-full bg-transparent py-3 text-[15.5px] outline-none placeholder:text-ink-faint"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="px-5 rounded-xl bg-brand text-brand-ink font-semibold text-[15px] hover:bg-brand-strong transition-colors disabled:opacity-60"
              >
                {busy ? "…" : "Look up"}
              </button>
            </form>
            <p className="mt-4 text-sm text-ink-faint">
              No account needed to look around. <span className="text-ink-soft font-medium">Free</span>, and every source is named.
            </p>
          </div>

          {/* cartographic product card */}
          <div className="bg-surface border border-line rounded-[20px] overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-line-soft">
              <span className="font-mono text-[12.5px] text-ink-soft">◎ Around 202 Church St, Leesburg VA</span>
              <span className="font-mono text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-full text-brand-strong border border-brand/25 bg-brand/10">within 5 mi</span>
            </div>
            <svg viewBox="0 0 440 300" width="100%" className="block" role="img" aria-label="A neighborhood map showing a proposed data center, an air monitor, and an upcoming county hearing within a few miles of a saved address.">
              <g stroke="var(--color-line)" strokeWidth="1">
                <path d="M0 70 H440M0 150 H440M0 230 H440" opacity="0.5" />
                <path d="M110 0 V300M250 0 V300M360 0 V300" opacity="0.5" />
                <path d="M0 20 L440 260" opacity="0.35" />
              </g>
              <g fill="none" stroke="var(--color-brand)">
                <circle cx="220" cy="150" r="118" strokeWidth="1.2" opacity="0.28" />
                <circle cx="220" cy="150" r="78" strokeWidth="1.2" opacity="0.4" />
                <circle cx="220" cy="150" r="40" strokeWidth="1.2" opacity="0.6" />
              </g>
              <circle cx="220" cy="150" r="6.5" fill="var(--color-brand)" />
              <circle cx="220" cy="150" r="6.5" fill="none" stroke="var(--color-surface)" strokeWidth="2" />
              <g transform="translate(150 78)">
                <rect x="-9" y="-9" width="18" height="18" rx="3" fill="var(--color-clay)" />
                <rect x="-9" y="-9" width="18" height="18" rx="3" fill="none" stroke="var(--color-surface)" strokeWidth="1.5" />
              </g>
              <rect x="322" y="196" width="15" height="15" rx="3" fill="var(--color-ink-faint)" />
              <circle cx="300" cy="96" r="7" fill="var(--color-sky)" />
              <circle cx="300" cy="96" r="7" fill="none" stroke="var(--color-surface)" strokeWidth="1.5" />
              <g transform="translate(140 205)">
                <path d="M0 -13 C7 -13 11 -8 11 -2 C11 6 0 15 0 15 C0 15 -11 6 -11 -2 C-11 -8 -7 -13 0 -13 Z" fill="var(--color-brand)" />
                <circle cx="0" cy="-2" r="3.4" fill="var(--color-surface)" />
              </g>
            </svg>
            <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3 border-t border-line-soft text-[12.5px] text-ink-soft">
              <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-clay)" }} />Proposed data center</span>
              <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-brand)" }} />Hearing · Oct 20</span>
              <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-sky)" }} />Air monitor</span>
            </div>
          </div>
        </div>
      </section>

      {/* LAYERS */}
      <section className={`${WRAP} py-16 border-t border-line-soft`}>
        <div className="max-w-2xl mb-10">
          <Eyebrow>What you can see</Eyebrow>
          <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.4rem)] font-bold">Your whole area — not just the listing.</h2>
          <p className="mt-3 text-ink-soft text-lg">A real-estate site shows you the house. Arounded shows you everything the tour skips: what&apos;s operating, what&apos;s coming, and what you&apos;re breathing.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { c: "var(--color-clay)", t: "Data centers", d: "Operating, under construction, and proposed — so you see what could still be stopped.", icon: <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M7 4v16M12 4v16M17 4v16" opacity="0.7" /></> },
            { c: "var(--color-honey)", t: "Power & industry", d: "Substations, plants, and industrial facilities — the infrastructure that follows the data centers.", icon: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /> },
            { c: "var(--color-sky)", t: "Air & smoke", d: "Live air quality and wildfire smoke where you are — plain numbers, no login wall.", icon: <path d="M4 15h10a3 3 0 1 0-3-3M2 9h13a2.5 2.5 0 1 1-2.5 2.5" strokeLinecap="round" /> },
            { c: "var(--color-brand)", t: "Local decisions", d: "The hearings and votes that decide what gets built — with the dates you can actually show up for.", icon: <path d="M6 6h13M6 12h13M6 18h13" strokeLinecap="round" /> },
          ].map((l) => (
            <div key={l.t} className="p-5 rounded-2xl border border-line bg-surface">
              <div className="w-10 h-10 rounded-xl grid place-items-center mb-4" style={{ background: l.c }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">{l.icon}</svg>
              </div>
              <h3 className="text-[1.1rem] font-bold">{l.t}</h3>
              <p className="mt-1.5 text-ink-soft text-[0.95rem]">{l.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DECISIONS FEATURE */}
      <section className={`${WRAP} py-16 border-t border-line-soft`}>
        <div className="grid lg:grid-cols-2 gap-11 items-center">
          <div>
            <Eyebrow>The part nobody else does</Eyebrow>
            <h2 className="mt-3 text-[clamp(1.8rem,3.6vw,2.5rem)] font-bold">Catch it before it&apos;s decided.</h2>
            <p className="mt-4 text-ink-soft text-lg max-w-[46ch]">Most people find out about the thing next door once the cranes arrive. Save a place, and Arounded tells you when a decision is coming near it — while there&apos;s still a comment window open.</p>
            <p className="mt-3.5 text-ink-soft text-lg max-w-[46ch]">Pulled from the county&apos;s own calendar and agendas, so you don&apos;t have to read them.</p>
            <Link href="/decisions" className="inline-flex mt-6 px-5 py-3 rounded-xl bg-brand text-brand-ink font-semibold text-[15px] hover:bg-brand-strong transition-colors">See decisions near you</Link>
          </div>
          <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-line-soft px-4">
              <span className="font-mono text-[12.5px] text-ink-soft">Upcoming near your saved places</span>
              <span className="font-mono text-[11px] uppercase px-2.5 py-1 rounded-full text-ink-soft border border-line">Loudoun County</span>
            </div>
            {[
              { d: "15", m: "Sep", t: "Vote on a data-center moratorium", meta: "Board of Supervisors · the county-wide “press pause” motion", tag: "Comment open", tc: "var(--color-clay)" },
              { d: "20", m: "Oct", t: "Quantum Park data centers — Waxpool Rd", meta: "Board decides whether to add more to the Verizon campus", tag: "2.4 mi away", tc: "var(--color-brand)" },
              { d: "22", m: "Oct", t: "Planning Commission public hearing", meta: "Agenda includes a special-exception application", tag: "Agenda posted", tc: "var(--color-ink-soft)" },
            ].map((e, i) => (
              <div key={i} className="flex gap-3.5 px-4 py-4 border-b border-line-soft last:border-b-0">
                <div className="font-mono text-[12px] text-ink-soft text-center w-[52px] shrink-0 leading-tight">
                  <b className="block text-[19px] text-ink font-semibold">{e.d}</b>{e.m}
                </div>
                <div className="text-[0.95rem]">
                  <div className="font-semibold">{e.t}</div>
                  <div className="text-ink-soft text-[0.86rem] mt-0.5">{e.meta}</div>
                  <span className="inline-block font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded mt-2" style={{ color: e.tc, background: "color-mix(in srgb, " + e.tc + " 14%, transparent)" }}>{e.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCE */}
      <section className={`${WRAP} py-16 border-t border-line-soft`}>
        <div className="max-w-2xl mb-8">
          <Eyebrow>Who it&apos;s for</Eyebrow>
          <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.4rem)] font-bold">Everyone who lives somewhere.</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-11">
          {[
            { t: "Neighbors", d: "Find out what's proposed down the road before it's a done deal — in time to say something.", icon: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></> },
            { t: "Movers & buyers", d: "Know what's really around an address before you sign — you can't renovate what's across the street.", icon: <><path d="M3 21h18M6 21V8l6-4 6 4v13" /><path d="M10 21v-6h4v6" /></> },
            { t: "Parents & the health-minded", d: "Keep an eye on the air and what's being built near home, school, and the places your kids play.", icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" /></> },
            { t: "Organizers & reporters", d: "Timely, sourced evidence you can share — the agenda item, the date, and the map, in one link.", icon: <><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1v-6h3M3 19a2 2 0 0 0 2 2h1v-6H3" /></> },
          ].map((a) => (
            <div key={a.t} className="flex gap-4 py-5 border-b border-line-soft">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" className="shrink-0 mt-0.5">{a.icon}</svg>
              <div>
                <h3 className="text-[1.02rem] font-bold">{a.t}</h3>
                <p className="text-ink-soft text-[0.94rem] mt-1">{a.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={`${WRAP} py-16 border-t border-line-soft`}>
        <div className="max-w-2xl mb-10">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 text-[clamp(1.7rem,3.4vw,2.4rem)] font-bold">Three steps, and it watches for you.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-7">
          {[
            { n: "STEP 01", t: "Look up a place", d: "Type any address. See what's around it — proposed and operating — with every source named." },
            { n: "STEP 02", t: "Save it", d: "Keep the places you care about: home, your parents', a school, a spot you're considering." },
            { n: "STEP 03", t: "Get told in time", d: "We watch the county calendar and ping you before a nearby decision — while comments are still open." },
          ].map((s) => (
            <div key={s.n} className="pt-6 border-t border-line">
              <div className="font-mono text-[13px] tracking-[0.1em] text-brand-strong">{s.n}</div>
              <h3 className="mt-2.5 text-[1.15rem] font-bold">{s.t}</h3>
              <p className="mt-2 text-ink-soft text-[0.97rem]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className={`${WRAP} py-16 border-t border-line-soft`}>
        <div className="bg-surface border border-line rounded-[20px] p-10 sm:p-12 text-center shadow-sm">
          <Eyebrow>Why you can trust it</Eyebrow>
          <h2 className="mt-3.5 text-[clamp(1.6rem,3.2vw,2.2rem)] font-bold max-w-[22ch] mx-auto">No scores. No spin. Just what&apos;s actually there.</h2>
          <p className="mt-4 text-ink-soft max-w-[52ch] mx-auto">Other tools hand you a mysterious &quot;risk number.&quot; Arounded shows you the real facilities and the real applications, links you to where each came from, and lets you decide.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            {["Facts, not a black-box score", "Every source named & linked", "Free — no login to look"].map((t) => (
              <span key={t} className="font-mono text-[12.5px] text-ink-soft border border-line rounded-full px-4 py-2">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CLOSING */}
      <section className={`${WRAP} py-20 text-center`}>
        <h2 className="text-[clamp(2rem,4.5vw,3rem)] font-bold tracking-tight">What&apos;s around your place?</h2>
        <p className="mt-4 text-ink-soft max-w-[44ch] mx-auto">Take a look — it&apos;s free, and you might be surprised what&apos;s within five miles.</p>
        <div className="flex flex-wrap gap-3 justify-center mt-7">
          <Link href="/near" className="px-6 py-3 rounded-xl bg-brand text-brand-ink font-semibold hover:bg-brand-strong transition-colors">Look up my address</Link>
          <Link href="/map" className="px-6 py-3 rounded-xl border border-line font-semibold hover:border-ink-soft transition-colors">Explore the map</Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
