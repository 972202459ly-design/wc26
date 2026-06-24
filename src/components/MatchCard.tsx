"use client";

import { Match } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import { getTeamFlagUrl, getTeamIdByName, amazonSearchLink, teams, stageLabel, matchKickoffISO } from "@/lib/data";

import MatchCountdown from "./MatchCountdown";
import MatchTime from "./MatchTime";

interface Prediction { homePct: number; drawPct: number; awayPct: number }
interface SocialPreview { reactions: Record<string, number>; topComment: string | null; commentCount: number }

export default function MatchCard({
  match,
  showShop = true,
  prediction,
  social,
}: {
  match: Match;
  showShop?: boolean;
  prediction?: Prediction;
  social?: SocialPreview;
}) {
  const [showShare, setShowShare] = useState(false);

  // Single canonical UTC kickoff — MatchTime converts it to the visitor's local
  // timezone (with GMT offset) so every page shows the same instant.
  const kickoffISO = matchKickoffISO(match);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  // Meta line: group (group stage) or knockout round label, plus venue if known.
  const group = teams.find((t) => t.name === match.homeTeam)?.group;
  const stageStr = stageLabel(match.stage);
  const metaLeft =
    match.stage === "GROUP_STAGE" && group ? `${group} · Group Stage` : stageStr;

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
    <article
      className={`relative p-4 rounded-xl border bg-[#111] card-hover ${
        isLive ? "border-green-500/30 animate-glow" : "border-[#222]"
      }`}
      onMouseEnter={() => setShowShare(true)}
      onMouseLeave={() => setShowShare(false)}
    >
      <Link href={`/match/${match.id}`} className="match-main block">
      {/* Meta row: competition context + clear status label */}
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-[#777]">{metaLeft}</span>
        {isLive ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 font-bold uppercase tracking-wide text-green-400">
            <span className="live-dot" />
            Live{match.minute ? ` · ${match.minute}'` : ""}
          </span>
        ) : isFinished ? (
          <span className="shrink-0 rounded-full bg-[#222] px-2 py-0.5 font-bold uppercase tracking-wide text-[#999]">
            FT
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[#f0a500]/10 px-2 py-0.5 font-bold uppercase tracking-wide text-[#f0a500]">
            Upcoming
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {homeFlag && <img src={homeFlag} alt="" className="w-5 h-3.5 inline-block mr-1.5 align-baseline" />}
            {match.homeTeam}
          </p>
        </div>
        <div className="shrink-0 px-2 text-center sm:px-4">
          <span
            className={`text-lg font-bold tabular-nums ${
              isLive ? "text-green-400" : ""
            }`}
          >
            {scoreDisplay}
          </span>
          {!isLive && (
            <MatchTime iso={kickoffISO} className="block text-xs text-[#888]" />
          )}
          {!isLive && !isFinished && (
            <MatchCountdown date={match.date} time={match.time} />
          )}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <p className="truncate font-semibold">
            {match.awayTeam}
            {awayFlag && <img src={awayFlag} alt="" className="w-5 h-3.5 inline-block ml-1.5 align-baseline" />}
          </p>
        </div>
      </div>
      {match.venue && <div className="mt-2 text-xs text-[#666]">📍 {match.venue}</div>}

      {/* Win-probability bar — upcoming matches only. Clearly labelled as a
          model estimate so it's never mistaken for official odds. */}
      {prediction && !isLive && !isFinished && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-right text-[10px] font-bold tabular-nums text-[#f0a500]">
              {prediction.homePct}%
            </span>
            <div className="relative flex-1 h-1.5 rounded-full overflow-hidden bg-[#1e1e1e]">
              <div
                className="absolute left-0 top-0 h-full rounded-l-full bg-[#f0a500]"
                style={{ width: `${prediction.homePct}%` }}
              />
              <div
                className="absolute top-0 h-full bg-[#3a3a3a]"
                style={{ left: `${prediction.homePct}%`, width: `${prediction.drawPct}%` }}
              />
              <div
                className="absolute right-0 top-0 h-full rounded-r-full bg-[#3498db]"
                style={{ width: `${prediction.awayPct}%` }}
              />
            </div>
            <span className="w-7 shrink-0 text-[10px] font-bold tabular-nums text-[#3498db]">
              {prediction.awayPct}%
            </span>
          </div>
          <p className="mt-1 text-right text-[10px] text-[#555]">
            🧠 AI estimate · not betting odds
          </p>
        </div>
      )}

      {/* Social preview — reactions + top comment */}
      {social && (Object.values(social.reactions).some((v) => v > 0) || social.topComment) && (
        <div className="mt-3 space-y-1.5">
          {Object.values(social.reactions).some((v) => v > 0) && (
            <div className="flex items-center gap-2 text-xs text-[#666]">
              {[["fire","🔥"],["ball","⚽"],["shock","😮"]].map(([key, icon]) =>
                (social.reactions[key] ?? 0) > 0 ? (
                  <span key={key}>{icon} {social.reactions[key]}</span>
                ) : null
              )}
              {social.commentCount > 0 && (
                <span className="ml-auto text-[#555]">💬 {social.commentCount}</span>
              )}
            </div>
          )}
          {social.topComment && (
            <p className="truncate text-xs italic text-[#555]">
              &ldquo;{social.topComment}&rdquo;
            </p>
          )}
        </div>
      )}

      </Link>

      {/* Affiliate shop link — a sibling of the match link (never nested inside
          it) so the markup is valid and the two targets can't be mis-clicked. */}
      {showShop && (
        <div className="mt-2 flex items-center gap-2">
          <a
            href={amazonSearchLink(`${match.homeTeam} ${match.awayTeam} World Cup jersey`)}
            target="_blank"
            rel="noopener noreferrer"
            className="affiliate-link text-xs text-[#f0a500]/60 hover:text-[#f0a500] transition-colors"
          >
            Shop jerseys &rarr;
          </a>
        </div>
      )}

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
          aria-label="Share on X"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
      )}
    </article>
  );
}
