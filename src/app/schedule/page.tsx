"use client";

import { matches } from "@/lib/data";
import MatchCard from "@/components/MatchCard";
import { useEffect, useState } from "react";
import type { Match } from "@/lib/types";

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

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((data) => {
        if (data.matches) setLiveScores(data.matches);
      })
      .catch(() => {});
  }, []);

  const merged = liveScores ? mergeScores(matches, liveScores) : matches;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Match Schedule</h1>

      {matchDays.map((date) => {
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
              {dayMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
