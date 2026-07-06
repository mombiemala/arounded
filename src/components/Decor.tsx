import React from "react";

/**
 * Decorative, self-contained SVG imagery — brand-tinted, theme-aware, and
 * purely ornamental (always aria-hidden + pointer-events-none). These soften
 * the flat dark UI without photographic weight, and all riff on the same
 * idea the product is about: what surrounds a place.
 */

type DecorProps = {
  className?: string;
  /** Base opacity for the motif; kept low so it never fights the content. */
  opacity?: number;
};

/**
 * Concentric "around a point" rings — the core brand motif. A soft ripple
 * radiating out from a single marked place.
 */
export function Rings({
  className = "",
  opacity = 0.14,
  count = 5,
}: DecorProps & { count?: number }) {
  const radii = Array.from({ length: count }, (_, i) => 14 + i * (86 / count));
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      fill="none"
      className={className}
      style={{ opacity }}
    >
      {radii.map((r, i) => (
        <circle
          key={r}
          cx="100"
          cy="100"
          r={r}
          stroke="var(--color-brand)"
          strokeWidth="0.5"
          strokeDasharray={i % 2 === 1 ? "2 4" : undefined}
        />
      ))}
      <circle cx="100" cy="100" r="4.5" fill="var(--color-brand)" />
    </svg>
  );
}

/**
 * Flowing topographic contour lines — an organic, terrain-like texture that
 * evokes maps, air, and landscape. Great for softening a hero corner.
 */
export function Contours({ className = "", opacity = 0.5 }: DecorProps) {
  const lines = [0, 20, 40, 60, 80, 100, 120];
  return (
    <svg
      aria-hidden
      viewBox="0 0 440 320"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      className={className}
    >
      {lines.map((o, i) => (
        <path
          key={o}
          d={`M-40 ${150 + o} C 70 ${70 + o}, 150 ${210 + o}, 250 ${120 + o} S 420 ${50 + o}, 500 ${140 + o}`}
          stroke="var(--color-brand)"
          strokeWidth="1"
          opacity={Math.max(0.08, opacity - i * 0.06)}
        />
      ))}
    </svg>
  );
}

/**
 * A soft radial glow — a warm brand halo behind headings and CTAs.
 */
export function Glow({
  className = "",
  opacity = 0.1,
}: DecorProps) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        opacity,
        background:
          "radial-gradient(circle, var(--color-brand) 0%, transparent 62%)",
      }}
    />
  );
}

/**
 * A scattered "map graticule" — faint dotted grid with a couple of marked
 * points, like plotted locations on a chart.
 */
export function Plots({ className = "", opacity = 0.16 }: DecorProps) {
  const cols = [0, 1, 2, 3, 4, 5, 6];
  const rows = [0, 1, 2, 3, 4];
  const marks = [
    [2, 1],
    [4, 3],
    [5, 0],
  ];
  return (
    <svg
      aria-hidden
      viewBox="0 0 210 150"
      fill="none"
      className={className}
      style={{ opacity }}
    >
      {rows.map((r) =>
        cols.map((c) => {
          const isMark = marks.some(([mc, mr]) => mc === c && mr === r);
          return (
            <circle
              key={`${c}-${r}`}
              cx={15 + c * 30}
              cy={15 + r * 30}
              r={isMark ? 3 : 1}
              fill="var(--color-brand)"
              opacity={isMark ? 1 : 0.4}
            />
          );
        })
      )}
      {marks.map(([c, r]) => (
        <circle
          key={`ring-${c}-${r}`}
          cx={15 + c * 30}
          cy={15 + r * 30}
          r={7}
          stroke="var(--color-brand)"
          strokeWidth="0.75"
          fill="none"
        />
      ))}
    </svg>
  );
}

/**
 * Ready-made hero backdrop: a glow + rings tucked into the top-right corner,
 * bleeding off the edge. Drop in as the first child of a `relative
 * overflow-hidden` container.
 */
export function HeroDecor({
  variant = "rings",
}: {
  variant?: "rings" | "contours" | "plots";
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <Glow className="absolute -top-40 right-[-12%] w-[560px] h-[560px] rounded-full" opacity={0.09} />
      {variant === "rings" && (
        <Rings className="absolute -top-24 right-[-10%] w-[460px] h-[460px] hidden sm:block" />
      )}
      {variant === "contours" && (
        <Contours className="absolute top-0 right-0 w-[620px] h-[360px] hidden sm:block" opacity={0.4} />
      )}
      {variant === "plots" && (
        <Plots className="absolute top-8 right-[-4%] w-[380px] hidden sm:block" />
      )}
    </div>
  );
}
