"use client";

import { matches, amazonSearchLink } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import type { SocialPreview } from "@/lib/db";
import MatchCard from "@/components/MatchCard";
import AdPlaceholder from "@/components/AdPlaceholder";
import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";
import { useTranslations } from "next-intl";

interface LiveMatch {
  match_id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

function mergeScores(staticMatches: Match[], live: LiveMatch[]): Match[] {
  const map = new Map<string, LiveMatch>();
  for (const lm of live) map.set(lm.match_id, lm);
  return staticMatches.map((m) => {
    const live = map.get(m.id);
    if (!live) return m;
    return {
      ...m,
      homeScore: live.home_score ?? m.homeScore,
      awayScore: live.away_score ?? m.awayScore,
      status: live.status === "FINISHED" ? "finished" : live.status === "IN_PLAY" ? "live" : m.status,
    };
  });
}

const matchDays = [...new Set(matches.map((m) => m.date))].sort();

export default function SchedulePage() {
  const [liveScores, setLiveScores] = useState<LiveMatch[] | null>(null);
  const [socialPreviews, setSocialPreviews] = useState<Record<string, SocialPreview>>({});
  const t = useTranslations("schedule");
  const shopT = useTranslations("schedule.shop");

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((data) => { if (data.matches) setLiveScores(data.matches); })
      .catch(() => {});
    fetch("/api/social-preview")
      .then((r) => r.json())
      .then((data) => setSocialPreviews(data ?? {}))
      .catch(() => {});
  }, []);

  const merged = liveScores ? mergeScores(matches, liveScores) : matches;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

      {matchDays.map((date, idx) => {
        const dayMatches = merged.filter((m) => m.date === date);
        return (
          <section key={date} className="mb-8">
            <h2 className="text-lg font-semibold text-[#f0a500] mb-3">
              {new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <div className="grid gap-3">
              {dayMatches.map((match) => {
                const pred = match.status === "upcoming"
                  ? predictMatch(match.homeTeam, match.awayTeam)
                  : undefined;
                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    prediction={pred ? { homePct: pred.homePct, drawPct: pred.drawPct, awayPct: pred.awayPct } : undefined}
                    social={socialPreviews[match.id]}
                  />
                );
              })}
            </div>
            {idx > 0 && idx % 3 === 0 && (
              <div className="mt-6">
                <AdPlaceholder size="banner" />
              </div>
            )}
          </section>
        );
      })}

      {/* Amazon Affiliate — Match Day Gear */}
      <div className="mt-10 rounded-xl border border-[#f0a500]/20 bg-gradient-to-br from-[#1e1e35] to-[#111] p-6 text-center">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.15em] text-[#f0a500]/60 border border-[#f0a500]/20 px-2 py-0.5 rounded mb-3">
          {shopT("sponsored")}
        </span>
        <h2 className="text-xl font-bold mb-2">{shopT("title")}</h2>
        <p className="text-sm text-[#888] mb-5 max-w-lg mx-auto">
          {shopT("description")}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a
            href={amazonSearchLink("World Cup 2026 jersey")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            {shopT("shopJerseys")}
          </a>
          <a
            href={amazonSearchLink("World Cup 2026 t-shirt")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("tShirts")}
          </a>
          <a
            href={amazonSearchLink("World Cup 2026 hat cap")}
            target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#222] text-white hover:bg-[#333] border border-[#444] transition-colors"
          >
            {shopT("hats")}
          </a>
        </div>
        <p className="text-[10px] text-[#555] mt-3">
          {shopT("affiliateNotice")}
        </p>
      </div>
    </div>
  );
}
