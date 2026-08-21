import { ImageResponse } from "next/og";

export const alt = "Arounded — the facts around the places you care about, not a risk score";
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
          <div
            style={{
              fontSize: "78px",
              fontWeight: 800,
              color: "#f2efe9",
              lineHeight: 1.04,
              letterSpacing: "-2px",
              maxWidth: "1000px",
              display: "flex",
            }}
          >
            The facts around a place — not a risk score.
          </div>
          <div style={{ fontSize: "30px", color: "#b7ab99", lineHeight: 1.3, maxWidth: "900px", display: "flex" }}>
            Data centers, facilities, air, and the local decisions that change them. Sourced. Free.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: "26px", color: "#8a8175" }}>arounded.kamalacreated.com</div>
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
