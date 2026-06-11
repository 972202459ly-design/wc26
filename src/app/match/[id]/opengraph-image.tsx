import { ImageResponse } from "next/og";
import { getMatchById } from "@/lib/data";

export const runtime = "edge";
export const alt = "World Cup 2026 Match";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = getMatchById(id);
  if (!match) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#0a0a1a",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 32,
          }}
        >
          Match Not Found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const hasScore =
    match.homeScore !== null && match.awayScore !== null;
  const scoreDisplay = hasScore ? `${match.homeScore} - ${match.awayScore}` : "vs";
  const stageDisplay = match.stage.replace(/_/g, " ");
  const isLive = match.status === "live";

  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)",
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
            height: 6,
            background: "linear-gradient(90deg, #f0a500, #ff6b00)",
          }}
        />

        {/* Stage */}
        <div
          style={{
            fontSize: 22,
            color: "#f0a500",
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          {stageDisplay}
        </div>

        {/* Live badge */}
        {isLive && (
          <div
            style={{
              fontSize: 16,
              color: "#22c55e",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="5" fill="#22c55e" />
            </svg>
            Live
          </div>
        )}

        {/* Score row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 48,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              textAlign: "right",
              maxWidth: 300,
            }}
          >
            {match.homeTeam}
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: isLive ? "#22c55e" : "#f0a500",
            }}
          >
            {scoreDisplay}
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 700,
              textAlign: "left",
              maxWidth: 300,
            }}
          >
            {match.awayTeam}
          </div>
        </div>

        {/* Date & venue */}
        <div
          style={{
            fontSize: 18,
            color: "#888",
            marginTop: 28,
          }}
        >
          {match.date}
          {match.venue ? ` · ${match.venue}` : ""}
        </div>

        {/* Branding */}
        <div
          style={{
            position: "absolute",
            bottom: 28,
            fontSize: 14,
            color: "#555",
            letterSpacing: "0.05em",
          }}
        >
          WC26 Live — 2026 FIFA World Cup Tracker
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
