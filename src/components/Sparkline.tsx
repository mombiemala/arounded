// Minimal inline-SVG sparkline. Values are oldest → newest; nulls are gaps.
export default function Sparkline({
  values,
  height = 40,
  color = "#33c4d4",
  fill = "rgba(51,196,212,0.15)",
}: {
  values: (number | null)[];
  height?: number;
  color?: string;
  fill?: string;
}) {
  const points = values.map((v, i) => ({ v, i }));
  const nums = points.filter((p): p is { v: number; i: number } => p.v != null);
  if (nums.length < 2) {
    return (
      <div style={{ height }} className="flex items-center text-[11px] opacity-40">
        Not enough history yet
      </div>
    );
  }

  const W = 100; // viewBox width; SVG scales to container width
  const H = height;
  const pad = 3;
  const n = values.length;
  const min = Math.min(...nums.map((p) => p.v));
  const max = Math.max(...nums.map((p) => p.v));
  const span = max - min || 1;

  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * (W - pad * 2) + pad);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);

  const line = nums.map((p, k) => `${k === 0 ? "M" : "L"} ${x(p.i).toFixed(2)} ${y(p.v).toFixed(2)}`).join(" ");
  const first = nums[0];
  const last = nums[nums.length - 1];
  const area = `${line} L ${x(last.i).toFixed(2)} ${H - pad} L ${x(first.i).toFixed(2)} ${H - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      width="100%"
      height={H}
      role="img"
      aria-label="Trend over time"
    >
      <path d={area} fill={fill} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      <circle cx={x(last.i)} cy={y(last.v)} r={2.2} fill={color} />
    </svg>
  );
}
