"use client";

import { Match } from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getTeamFlagUrlBig, getTeamIdByName, amazonSearchLink, stageLabel, matchKickoffISO } from "@/lib/data";
import AdPlaceholder from "@/components/AdPlaceholder";
import MatchPrediction, { type InitialPred } from "@/components/MatchPrediction";
import MatchCountdown from "@/components/MatchCountdown";
import MatchTime from "@/components/MatchTime";
import EventsTimeline from "@/components/EventsTimeline";
import MatchComments from "@/components/MatchComments";
import StreamingOptionsCard from "@/components/StreamingOptionsCard";
import { useTranslations } from "next-intl";

export default function MatchDetail({
  match: initial,
  prediction,
  analysisTeaser,
}: {
  match: Match;
  prediction: InitialPred;
  analysisTeaser: string;
}) {
  const [match, setMatch] = useState(initial);
  const isLive = match.status === "live";
  const t = useTranslations("match");

  const homeId = getTeamIdByName(match.homeTeam) || "";
  const awayId = getTeamIdByName(match.awayTeam) || "";
  const homeFlag = getTeamFlagUrlBig(homeId);
  const awayFlag = getTeamFlagUrlBig(awayId);

  // Fetch latest scores from /api/scores on mount
  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((data) => {
        if (!data.matches) return;
        const live = data.matches.find(
          (lm: any) => lm.match_id === initial.id
        );
        if (!live) return;
        setMatch((prev) => ({
          ...prev,
          homeScore: live.home_score ?? prev.homeScore,
          awayScore: live.away_score ?? prev.awayScore,
          homePenaltyScore: live.home_penalty_score ?? prev.homePenaltyScore,
          awayPenaltyScore: live.away_penalty_score ?? prev.awayPenaltyScore,
          winner: live.winner ?? prev.winner,
          status:
            live.status === "FINISHED"
              ? "finished"
              : live.status === "IN_PLAY"
                ? "live"
                : prev.status,
        }));
      })
      .catch(() => {});
  }, [initial.id]);

  // Poll for live updates (always, in case status changes)
  useEffect(() => {
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
  }, [match.id]);

  const scoreDisplay =
    match.homeScore !== null && match.awayScore !== null
      ? `${match.homeScore} - ${match.awayScore}`
      : "vs";
  const resultNote =
    match.status === "finished" && match.winner
      ? match.homePenaltyScore != null && match.awayPenaltyScore != null
        ? `${match.winner === "home" ? match.homeTeam : match.awayTeam} advance ${match.homePenaltyScore}-${match.awayPenaltyScore} on penalties`
        : match.homeScore === match.awayScore
          ? `${match.winner === "home" ? match.homeTeam : match.awayTeam} advance after extra time`
          : `${match.winner === "home" ? match.homeTeam : match.awayTeam} advance`
      : match.status === "finished" &&
          match.homeScore === match.awayScore &&
          match.stage !== "GROUP_STAGE"
        ? "Penalty winner pending confirmation"
        : null;

  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://wc26live.org"}/match/${match.id}`;
  const shareText = `${match.homeTeam} ${match.homeScore ?? 0}-${match.awayScore ?? 0} ${match.awayTeam}${isLive ? " 🔴 LIVE" : ""} — World Cup 2026`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/schedule"
        className="text-sm text-[#888] hover:text-white mb-6 inline-block"
      >
        {t("backToSchedule")}
      </Link>

      <div className="text-center">
        <p className="text-sm text-[#f0a500] font-semibold uppercase tracking-wider mb-2">
          {stageLabel(match.stage)}
        </p>

        {isLive && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-green-400 bg-green-400/10 rounded-full mb-4">
            <span className="live-dot" />
            {t("live")}
          </span>
        )}

        <h1 className="text-4xl sm:text-5xl font-bold mb-2">
          {homeFlag && <img src={homeFlag} alt="" className="w-6 h-4.5 inline-block mr-2 align-middle" />}
          {match.homeTeam}{" "}
          <span className={`${isLive ? "text-green-400 animate-glow rounded-lg px-2" : ""}`}>
            {scoreDisplay}
          </span>{" "}
          {match.awayTeam}
          {awayFlag && <img src={awayFlag} alt="" className="w-6 h-4.5 inline-block ml-2 align-middle" />}
        </h1>
        {resultNote && (
          <p className="mb-4 text-sm font-semibold text-green-400">{resultNote}</p>
        )}

        <p className="text-[#888] mb-6">
          {match.venue && <>{match.venue} &middot; </>}
          <MatchTime iso={matchKickoffISO(match)} variant="full" />
        </p>

        {/* Countdown for upcoming matches */}
        {match.status === "upcoming" && (
          <div className="mb-6">
            <MatchCountdown date={match.date} time={match.time} />
          </div>
        )}

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
          {t("shareOnX")}
        </button>
      </div>

      {/* AI prediction + pick'em — prominent, right under the score header */}
      <MatchPrediction
        matchId={match.id}
        home={match.homeTeam}
        away={match.awayTeam}
        initialPred={prediction}
        initialAnalysis={analysisTeaser}
        initialStatus={initial.status}
      />

      <div className="mt-6">
        <StreamingOptionsCard
          placement="match_detail"
          compact
          title={`How to watch ${match.homeTeam} vs ${match.awayTeam}`}
          matchLabel={`${match.homeTeam} vs ${match.awayTeam}`}
        />
      </div>

      {/* Match Events Timeline */}
      {(match.status === "live" || match.status === "finished") && (
        <EventsTimeline
          matchId={match.id}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          isFinished={match.status === "finished"}
          isLive={match.status === "live"}
        />
      )}

      {/* Fan comments & reactions */}
      <MatchComments matchId={match.id} />

      {/* Ad banner */}
      <div className="mt-8">
        <AdPlaceholder size="banner" />
      </div>

      {/* Affiliate — watch party gear */}
      <div className="mt-6 rounded-xl border border-[#222] bg-[#111] p-5 text-center">
        <p className="text-sm font-semibold mb-3">🎉 Set Up the Ultimate Watch Party</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href={amazonSearchLink("Fire TV Stick 4K streaming")}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            📡 Fire TV Stick 4K
          </a>
          <a
            href={amazonSearchLink("portable bluetooth speaker outdoor party")}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            🔊 Party Speaker
          </a>
          <a
            href={amazonSearchLink("soccer watch party supplies decorations")}
            target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#222] border border-[#444] text-[#ccc] hover:text-white transition-colors"
          >
            🎉 Party Supplies
          </a>
        </div>
        <p className="text-[10px] text-[#555] mt-2">
          {t("affiliateNotice")}
        </p>
      </div>
    </div>
  );
}
