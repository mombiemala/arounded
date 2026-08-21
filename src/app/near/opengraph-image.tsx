import { ImageResponse } from "next/og";

export const alt = "What's around this address — the real facts, every source named";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#141210",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "22px", height: "22px", borderRadius: "999px", background: "#a3b579", display: "flex" }} />
          <div style={{ fontSize: "34px", fontWeight: 700, color: "#f2efe9", letterSpacing: "-0.5px" }}>Arounded</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <div style={{ fontSize: "26px", color: "#a3b579", fontWeight: 600, letterSpacing: "2px", display: "flex" }}>
            WHAT&apos;S AROUND THIS ADDRESS
          </div>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 800,
              color: "#f2efe9",
              lineHeight: 1.05,
              letterSpacing: "-2px",
              maxWidth: "1000px",
              display: "flex",
            }}
          >
            The real facts around a place.
          </div>
          <div style={{ fontSize: "30px", color: "#b7ab99", lineHeight: 1.3, maxWidth: "920px", display: "flex" }}>
            Data centers nearby, what&apos;s proposed next door, and upcoming decisions — every source named.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "26px", color: "#8a8175" }}>Not a black-box risk score.</div>
          <div style={{ display: "flex", gap: "12px" }}>
            {["#ecab3f", "#cf7d4a", "#b7a582", "#a3b579"].map((c) => (
              <div key={c} style={{ width: "18px", height: "18px", borderRadius: "999px", background: c, display: "flex" }} />
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
