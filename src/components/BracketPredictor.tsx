"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getTeamFlagUrl } from "@/lib/data";
import { track } from "@/lib/track";
import SignInForm from "./SignInForm";

export interface PredictorMatch {
  id: string;
  roundKey: string;
  roundLabel: string;
  homeTeam: string;
  awayTeam: string;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  date: string;
  time: string;
}

const REWARD_BY_ROUND: Record<string, number> = {
  r32: 100,
  r16: 200,
  qf: 400,
  sf: 800,
  final: 1600,
  tp: 300,
};

function formatKickoff(date: string, time: string) {
  if (!date) return "TBD";
  const cleanTime = (time || "00:00").replace(/Z$/, "").slice(0, 5);
  const kickoff = new Date(`${date}T${cleanTime}:00Z`);
  if (Number.isNaN(kickoff.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(kickoff);
}

function isPickable(m: PredictorMatch) {
  return (
    m.status === "upcoming" &&
    m.homeTeam.toLowerCase() !== "tbd" &&
    m.awayTeam.toLowerCase() !== "tbd"
  );
}

export default function BracketPredictor({
  matches,
  authed,
}: {
  matches: PredictorMatch[];
  authed: boolean;
}) {
  const [picks, setPicks] = useState<Record<string, "home" | "away">>({});
  const [gateOpen, setGateOpen] = useState(false);

  const requireAuth = () => {
    if (authed) return false;
    setGateOpen(true);
    track("premium_teaser_view", "simulator", { feature: "bracket_predictor_signin_gate" });
    return true;
  };

  const selected = Object.keys(picks).length;
  const potentialPoints = useMemo(
    () =>
      Object.entries(picks).reduce((sum, [id]) => {
        const match = matches.find((m) => m.id === id);
        return sum + (match ? REWARD_BY_ROUND[match.roundKey] ?? 100 : 0);
      }, 0),
    [matches, picks]
  );
  const pickableCount = matches.filter(isPickable).length;

  const choose = (match: PredictorMatch, side: "home" | "away") => {
    if (requireAuth()) return;
    setPicks((current) => ({ ...current, [match.id]: side }));
    track("bracket_pick", "simulator", {
      matchId: match.id,
      pick: side,
      format: "bracket_predictor",
    });
  };

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-[#222] bg-[#111] p-4">
          <div className="text-xs uppercase tracking-wide text-[#777]">Picks made</div>
          <div className="mt-1 text-2xl font-bold text-white">
            {selected}
            <span className="text-sm font-normal text-[#777]"> / {pickableCount}</span>
          </div>
        </div>
        <div className="rounded-lg border border-[#222] bg-[#111] p-4">
          <div className="text-xs uppercase tracking-wide text-[#777]">Potential reward</div>
          <div className="mt-1 text-2xl font-bold text-[#f0a500]">{potentialPoints.toLocaleString()} pts</div>
        </div>
        <Link
          href="/leaderboard"
          className="rounded-lg border border-[#f0a500]/40 bg-[#f0a500]/10 p-4 transition-colors hover:border-[#f0a500]"
        >
          <div className="text-xs uppercase tracking-wide text-[#f0a500]">Leaderboard</div>
          <div className="mt-1 text-sm font-semibold text-white">See the race for the top spot</div>
        </Link>
      </div>

      {!authed && (
        <button
          type="button"
          onClick={() => requireAuth()}
          className="mb-5 flex w-full items-center justify-between gap-3 rounded-xl border border-[#f0a500]/40 bg-[#151515] px-5 py-3 text-left transition-colors hover:border-[#f0a500]/70"
        >
          <span className="text-sm text-[#ddd]">
            <b className="text-white">Sign in free to lock your bracket</b>. Start with 1,000 virtual
            points and compete for badges.
          </span>
          <span className="shrink-0 rounded-lg bg-[#f0a500] px-4 py-2 text-xs font-bold text-black">
            Join free
          </span>
        </button>
      )}

      <div className="space-y-6">
        {["r32", "r16", "qf", "sf", "final", "tp"].map((roundKey) => {
          const roundMatches = matches.filter((m) => m.roundKey === roundKey);
          if (!roundMatches.length) return null;
          const reward = REWARD_BY_ROUND[roundKey] ?? 100;
          return (
            <section key={roundKey}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-[#f0a500]">
                  {roundMatches[0].roundLabel}
                </h2>
                <span className="text-xs text-[#777]">+{reward} pts per correct pick</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {roundMatches.map((m) => {
                  const disabled = !isPickable(m);
                  const selectedSide = picks[m.id];
                  const hasScore = m.homeScore !== null && m.awayScore !== null;
                  return (
                    <div key={m.id} className="rounded-xl border border-[#222] bg-[#111] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#777]">
                        <span>{formatKickoff(m.date, m.time)}</span>
                        {m.status === "live" ? (
                          <span className="font-bold text-green-400">LIVE</span>
                        ) : m.status === "finished" ? (
                          <span>Final</span>
                        ) : (
                          <span>Locks at kickoff</span>
                        )}
                      </div>

                      <div className="grid gap-2">
                        {(["home", "away"] as const).map((side) => {
                          const name = side === "home" ? m.homeTeam : m.awayTeam;
                          const id = side === "home" ? m.homeId : m.awayId;
                          const score = side === "home" ? m.homeScore : m.awayScore;
                          const active = selectedSide === side;
                          return (
                            <button
                              key={side}
                              type="button"
                              disabled={disabled}
                              onClick={() => choose(m, side)}
                              className={`flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                                active
                                  ? "border-[#f0a500] bg-[#f0a500] text-black"
                                  : "border-[#2a2a2a] bg-[#0d0d0d] text-white hover:border-[#555]"
                              } ${disabled ? "cursor-default opacity-70" : ""}`}
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                {id && (
                                  <img
                                    src={getTeamFlagUrl(id)}
                                    alt=""
                                    className="h-3.5 w-5 shrink-0 rounded-sm"
                                  />
                                )}
                                <span className="truncate text-sm font-semibold">{name}</span>
                              </span>
                              <span className="shrink-0 text-sm font-bold tabular-nums">
                                {hasScore ? score : active ? `+${reward}` : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                        <Link href={`/match/${m.id}`} className="text-[#888] hover:text-white">
                          Match center
                        </Link>
                        {selectedSide && <span className="font-semibold text-[#f0a500]">Pick saved locally</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {gateOpen && !authed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setGateOpen(false)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-center">
              <div className="text-lg font-bold text-white">Lock your bracket for free</div>
              <p className="mt-1 text-sm text-[#aaa]">
                Create a free account, get 1,000 virtual points, and start climbing the leaderboard.
              </p>
            </div>
            <SignInForm redirectTo="/simulator" />
            <button
              type="button"
              onClick={() => setGateOpen(false)}
              className="mt-3 w-full text-center text-xs text-[#888] hover:text-white"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
