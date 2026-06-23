"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import MatchCard from "@/components/MatchCard";
import type { Match } from "@/lib/types";
import type { SocialPreview } from "@/lib/db";

interface Prediction {
  homePct: number;
  drawPct: number;
  awayPct: number;
}

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
    const lm = map.get(m.id);
    if (!lm) return m;
    return {
      ...m,
      homeScore: lm.home_score ?? m.homeScore,
      awayScore: lm.away_score ?? m.awayScore,
      status:
        lm.status === "FINISHED"
          ? "finished"
          : lm.status === "IN_PLAY" || lm.status === "PAUSED"
            ? "live"
            : m.status,
    };
  });
}

export default function HomeMatchSections({
  today,
  upcoming,
  recent,
  predictions,
  generatedAt,
}: {
  today: Match[];
  upcoming: Match[];
  recent: Match[];
  predictions: Record<string, Prediction>;
  generatedAt: string;
}) {
  const t = useTranslations("home");
  const [liveScores, setLiveScores] = useState<LiveMatch[] | null>(null);
  const [social, setSocial] = useState<Record<string, SocialPreview>>({});
  const [updatedAt, setUpdatedAt] = useState<string>(generatedAt);

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((data) => {
        if (data.matches) {
          setLiveScores(data.matches);
          setUpdatedAt(new Date().toISOString());
        }
      })
      .catch(() => {});
    fetch("/api/social-preview")
      .then((r) => r.json())
      .then((data) => setSocial(data ?? {}))
      .catch(() => {});
  }, []);

  const mToday = liveScores ? mergeScores(today, liveScores) : today;
  const mUpcoming = liveScores ? mergeScores(upcoming, liveScores) : upcoming;
  const mRecent = liveScores ? mergeScores(recent, liveScores) : recent;

  // ET-formatted "last updated" stamp, computed client-side so it reflects the
  // visitor's actual last data refresh.
  const updatedLabel =
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(updatedAt)) + " ET";

  return (
    <>
      {/* Today's matches */}
      <section className="max-w-7xl mx-auto px-4 pb-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-xl font-bold">{t("todaysMatches")}</h2>
          <span className="text-xs text-[#777]">
            {t("lastUpdated")}: {updatedLabel}
          </span>
        </div>
        {mToday.length > 0 ? (
          <div className="grid gap-3">
            {mToday.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                showShop={false}
                prediction={predictions[match.id]}
                social={social[match.id]}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-[#222] bg-[#111] py-12 text-center">
            <p className="text-[#888]">{t("noMatchesToday")}</p>
          </div>
        )}
      </section>

      {/* Upcoming matches */}
      {mUpcoming.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-8">
          <h2 className="text-xl font-bold mb-4">{t("upcomingMatches")}</h2>
          <div className="grid gap-3">
            {mUpcoming.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                showShop={false}
                prediction={predictions[match.id]}
                social={social[match.id]}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent results */}
      {mRecent.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-8">
          <h2 className="text-xl font-bold mb-4">{t("recentResults")}</h2>
          <div className="grid gap-3">
            {mRecent.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                showShop={false}
                social={social[match.id]}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
