"use client";

import { Match } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import { getTeamFlagUrl, getTeamIdByName, amazonSearchLink } from "@/lib/data";

export default function MatchCard({ match }: { match: Match }) {
  const [showShare, setShowShare] = useState(false);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  const homeId = getTeamIdByName(match.homeTeam) || "";
  const awayId = getTeamIdByName(match.awayTeam) || "";
  const homeFlag = getTeamFlagUrl(homeId);
  const awayFlag = getTeamFlagUrl(awayId);

  const scoreDisplay =
    match.homeScore !== null && match.awayScore !== null
      ? `${match.homeScore} - ${match.awayScore}`
      : "vs";

  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://wc26live.org"}/match/${match.id}`;
  const shareText = `${match.homeTeam} ${match.homeScore ?? 0}-${match.awayScore ?? 0} ${match.awayTeam}${isLive ? " 🔴 LIVE" : ""} — World Cup 2026`;

  return (
    <Link
      href={`/match/${match.id}`}
      className={`relative block p-4 rounded-xl border bg-[#111] card-hover ${
        isLive ? "border-green-500/30 animate-glow" : "border-[#222]"
      }`}
      onMouseEnter={() => setShowShare(true)}
      onMouseLeave={() => setShowShare(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-semibold">
            {homeFlag && <img src={homeFlag} alt="" className="w-5 h-3.5 inline-block mr-1.5 align-baseline" />}
            {match.homeTeam}
          </p>
        </div>
        <div className="text-center px-4">
          {isLive && (
            <span className="text-xs text-green-400 font-semibold uppercase tracking-wider block mb-1">
              <span className="live-dot align-middle mr-1" />
              Live
            </span>
          )}
          <span
            className={`text-lg font-bold ${
              isLive ? "text-green-400" : ""
            }`}
          >
            {scoreDisplay}
          </span>
          {isLive && match.minute && (
            <span className="text-xs text-[#888] block">
              {match.minute}&apos;
            </span>
          )}
          {!isLive && !isFinished && (
            <span className="text-xs text-[#888] block">
              {match.date} {match.time}
            </span>
          )}
        </div>
        <div className="flex-1 text-right">
          <p className="font-semibold">
            {match.awayTeam}
            {awayFlag && <img src={awayFlag} alt="" className="w-5 h-3.5 inline-block ml-1.5 align-baseline" />}
          </p>
        </div>
      </div>
      <div className="text-xs text-[#666] mt-2">{match.venue}</div>

      {/* Affiliate shop link */}
      <div className="mt-2 flex items-center gap-2">
        <a
          href={amazonSearchLink(`${match.homeTeam} ${match.awayTeam} World Cup jersey`)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-[#f0a500]/60 hover:text-[#f0a500] transition-colors"
        >
          Shop jerseys &rarr;
        </a>
      </div>

      {/* Share button */}
      {showShare && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
              "_blank",
              "noopener,noreferrer"
            );
          }}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-[#222] hover:bg-[#333] transition-colors"
          title="Share on X"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
      )}
    </Link>
  );
}
