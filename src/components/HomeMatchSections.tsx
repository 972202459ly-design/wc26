"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import MatchCard from "@/components/MatchCard";
import { matches, liveStatus, matchKickoff } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
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

const isReal = (m: Match) => m.homeTeam !== "tbd" && m.awayTeam !== "tbd";
const realMatches = matches.filter(isReal);

/** YYYY-MM-DD in the visitor's own local timezone. */
function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Re-bucket every real fixture by the visitor's LOCAL calendar date, so "Today"
// reflects the user's day — not the server's US-Eastern day.
function computeLocalBuckets(now: Date) {
  const todayStr = localDateStr(now);
  const withStatus = realMatches.map((m) => ({ ...m, status: liveStatus(m, now) }));
  const byKickoffAsc = (a: Match, b: Match) =>
    matchKickoff(a).getTime() - matchKickoff(b).getTime();

  const today = withStatus
    .filter((m) => localDateStr(matchKickoff(m)) === todayStr && m.status !== "finished")
    .sort(byKickoffAsc);
  const upcoming = withStatus
    .filter(
      (m) =>
        matchKickoff(m).getTime() > now.getTime() &&
        localDateStr(matchKickoff(m)) !== todayStr
    )
    .sort(byKickoffAsc)
    .slice(0, 6);
  const recent = withStatus
    .filter((m) => m.status === "finished")
    .sort((a, b) => matchKickoff(b).getTime() - matchKickoff(a).getTime())
    .slice(0, 6);

  return { today, upcoming, recent };
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
  // Local-timezone buckets — null until mounted, so the first client render
  // matches the server (ET) HTML and there's no hydration mismatch.
  const [local, setLocal] = useState<ReturnType<typeof computeLocalBuckets> | null>(null);
  const [tzLabel, setTzLabel] = useState("");

  useEffect(() => {
    setLocal(computeLocalBuckets(new Date()));
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZoneName: "shortOffset",
        hour: "numeric",
      }).formatToParts(new Date());
      setTzLabel(parts.find((p) => p.type === "timeZoneName")?.value ?? "");
    } catch {
      /* ignore */
    }

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

  // Once mounted, prefer the visitor-local buckets; before that, the server's.
  const baseToday = local ? local.today : today;
  const baseUpcoming = local ? local.upcoming : upcoming;
  const baseRecent = local ? local.recent : recent;

  const mToday = liveScores ? mergeScores(baseToday, liveScores) : baseToday;
  const mUpcoming = liveScores ? mergeScores(baseUpcoming, liveScores) : baseUpcoming;
  const mRecent = liveScores ? mergeScores(baseRecent, liveScores) : baseRecent;

  // Use the server prediction if present, else compute one client-side for any
  // fixture promoted into the local "today/upcoming" buckets.
  const predFor = (m: Match): Prediction | undefined => {
    if (predictions[m.id]) return predictions[m.id];
    if (m.status === "upcoming") {
      const p = predictMatch(m.homeTeam, m.awayTeam);
      return { homePct: p.homePct, drawPct: p.drawPct, awayPct: p.awayPct };
    }
    return undefined;
  };

  const updatedLabel =
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(updatedAt)) + (tzLabel ? ` ${tzLabel}` : "");

  return (
    <>
      {/* Today's matches — bucketed by the visitor's local date */}
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
                prediction={predFor(match)}
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

      {/* Upcoming matches — strictly after today, so it never repeats Today */}
      {mUpcoming.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-8">
          <h2 className="text-xl font-bold mb-4">{t("upcomingMatches")}</h2>
          <div className="grid gap-3">
            {mUpcoming.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                showShop={false}
                prediction={predFor(match)}
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
