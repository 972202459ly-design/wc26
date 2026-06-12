import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "WC26 Live — 2026 FIFA World Cup Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 40%, #0d1b2a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          color: "white",
          position: "relative",
        }}
      >
        {/* Gold top bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, #f0a500, #ff6b00, #f0a500)",
          }}
        />

        {/* Subtle pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 30% 50%, rgba(240,165,0,0.06) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(240,165,0,0.04) 0%, transparent 50%)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          {/* WC26 LIVE title */}
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "0.05em",
              background:
                "linear-gradient(180deg, #ffffff 0%, #e0d8c0 100%)",
              backgroundClip: "text",
              color: "transparent",
              lineHeight: 1,
            }}
          >
            WC26 LIVE
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 32,
              color: "#f0a500",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            2026 FIFA World Cup Tracker
          </div>
        </div>

        {/* Trophy icon */}
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 80,
            width: 80,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="80" height="80" viewBox="0 0 64 64" fill="none">
            <path
              d="M32 4C32 4 16 20 16 36C16 44.8 23.2 52 32 52C40.8 52 48 44.8 48 36C48 20 32 4 32 4Z"
              fill="#f0a500"
              opacity="0.2"
            />
            <path
              d="M22 48L20 60L32 56L44 60L42 48"
              stroke="#f0a500"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M32 4V52"
              stroke="#f0a500"
              strokeWidth="1"
              opacity="0.4"
            />
          </svg>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "#666",
            letterSpacing: "0.05em",
          }}
        >
          wc26live.org — Live scores, alerts &amp; updates
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, #f0a500, #ff6b00, #f0a500)",
            opacity: 0.5,
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
