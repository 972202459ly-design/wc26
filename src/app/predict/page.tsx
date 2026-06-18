"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Target, Trophy } from "lucide-react";
import { matches } from "@/lib/data";
import type { Match } from "@/lib/types";
import GameDisclaimer from "@/components/GameDisclaimer";

interface LiveMatch { match_id: string; home_score: number | null; away_score: number | null; status: string }

function mergeStatus(m: Match, live?: LiveMatch): Match {
  if (!live) return m;
  return {
    ...m,
    homeScore: live.home_score ?? m.homeScore,
    awayScore: live.away_score ?? m.awayScore,
    status: live.status === "FINISHED" ? "finished" : (live.status === "IN_PLAY" || live.status === "PAUSED") ? "live" : "upcoming",
  };
}

export default function PredictPage() {
  const [live, setLive] = useState<Map<string, LiveMatch> | null>(null);

  useEffect(() => {
    fetch("/api/scores")
      .then((r) => r.json())
      .then((d) => {
        if (d.matches) setLive(new Map((d.matches as LiveMatch[]).map((m) => [m.match_id, m])));
        else setLive(new Map());
      })
      .catch(() => setLive(new Map()));
  }, []);

  const upcoming = matches
    .map((m) => mergeStatus(m, live?.get(m.id)))
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-2 flex items-center gap-2">
        <Target className="h-6 w-6 text-[#f0a500]" />
        <h1 className="text-2xl font-bold text-white">Make a Prediction</h1>
      </div>
      <p className="mb-5 text-sm text-[#999]">
        Pick an upcoming match, stake your free points at AI-derived odds, and climb the{" "}
        <Link href="/leaderboard" className="text-[#f0a500] hover:underline">leaderboard</Link>.
      </p>

      {live === null ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-[#111]" />)}</div>
      ) : upcoming.length === 0 ? (
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-8 text-center text-[#999]">
          No upcoming matches right now — check back soon.
        </div>
      ) : (
        <div className="space-y-2">
          {upcoming.map((m) => {
            const d = new Date(`${m.date}T${m.time}`);
            const when = d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
            return (
              <Link
                key={m.id}
                href={`/match/${m.id}`}
                className="flex items-center justify-between rounded-lg border border-[#222] bg-[#111] px-4 py-3 transition-colors hover:border-[#f0a500]"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-white">{m.homeTeam} <span className="text-[#666]">vs</span> {m.awayTeam}</div>
                  <div className="text-xs text-[#888]">{when} · {m.stage?.replace(/_/g, " ")}</div>
                </div>
                <span className="ml-3 shrink-0 rounded-md bg-[#f0a500] px-3 py-1.5 text-xs font-bold text-black">Predict →</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-center">
        <Link href="/leaderboard" className="inline-flex items-center gap-1.5 text-sm text-[#aaa] hover:text-white">
          <Trophy className="h-4 w-4" /> View leaderboard
        </Link>
      </div>

      <GameDisclaimer className="mt-8" />
    </div>
  );
}
