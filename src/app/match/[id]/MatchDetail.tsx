"use client";

import { Match } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function MatchDetail({ match: initial }: { match: Match }) {
  const [match, setMatch] = useState(initial);
  const isLive = match.status === "live";

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/match/${match.id}`);
        if (res.ok) {
          const data = await res.json();
          setMatch((prev) => ({ ...prev, ...data }));
        }
      } catch {
        // ignore polling errors
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isLive, match.id]);

  const scoreDisplay =
    match.homeScore !== null && match.awayScore !== null
      ? `${match.homeScore} - ${match.awayScore}`
      : "vs";

  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://wc26live.org"}/match/${match.id}`;
  const shareText = `${match.homeTeam} ${match.homeScore ?? 0}-${match.awayScore ?? 0} ${match.awayTeam}${isLive ? " 🔴 LIVE" : ""} — World Cup 2026`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/schedule"
        className="text-sm text-[#888] hover:text-white mb-6 inline-block"
      >
        &larr; Back to Schedule
      </Link>

      <div className="text-center">
        <p className="text-sm text-[#f0a500] font-semibold uppercase tracking-wider mb-2">
          {match.stage}
        </p>

        {isLive && (
          <span className="inline-block px-2 py-0.5 text-xs font-semibold text-green-400 bg-green-400/10 rounded-full mb-4">
            🔴 Live
          </span>
        )}

        <h1 className="text-4xl sm:text-5xl font-bold mb-2">
          {match.homeTeam}{" "}
          <span className={isLive ? "text-green-400" : ""}>
            {scoreDisplay}
          </span>{" "}
          {match.awayTeam}
        </h1>

        <p className="text-[#888] mb-6">
          {match.venue} &middot;{" "}
          {new Date(match.date + "T" + match.time).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
          , {match.time}
        </p>

        {/* Share button */}
        <button
          onClick={() =>
            window.open(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
              "_blank",
              "noopener,noreferrer"
            )
          }
          className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-[#333] text-[#888] hover:text-white hover:border-white transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </button>
      </div>
    </div>
  );
}
