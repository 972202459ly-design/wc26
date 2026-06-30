"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, Lock, Target, Trophy } from "lucide-react";
import { getTeamFlagUrl, stageLabel } from "@/lib/data";
import { track } from "@/lib/track";
import SignInForm from "./SignInForm";
import GameDisclaimer from "./GameDisclaimer";

export interface PickemMatch {
  id: string;
  stage: string;
  roundLabel: string;
  homeTeam: string;
  awayTeam: string;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  winner: "home" | "away" | null;
  status: "upcoming" | "live" | "finished";
  utc: string;
  homeAdvancePct: number;
  awayAdvancePct: number;
  aiPick: "home" | "away";
  homeReward: number;
  awayReward: number;
  homeTag: "Favorite" | "Toss-up" | "Upset";
  awayTag: "Favorite" | "Toss-up" | "Upset";
}

type PickSide = "home" | "away";

const PENDING_KEY = "wc26_pending_advance_pick";

function teamName(m: PickemMatch, side: PickSide) {
  return side === "home" ? m.homeTeam : m.awayTeam;
}

function flagId(m: PickemMatch, side: PickSide) {
  return side === "home" ? m.homeId : m.awayId;
}

function rewardFor(m: PickemMatch, side: PickSide) {
  return side === "home" ? m.homeReward : m.awayReward;
}

function tagFor(m: PickemMatch, side: PickSide) {
  return side === "home" ? m.homeTag : m.awayTag;
}

function formatKickoff(utc: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(utc));
}

function resultLine(m: PickemMatch) {
  if (m.status !== "finished" || m.homeScore === null || m.awayScore === null) return null;
  const winner = m.winner ? teamName(m, m.winner) : null;
  const hasPens = m.homePenaltyScore !== null && m.awayPenaltyScore !== null;
  if (winner && hasPens) {
    return `${winner} advance ${m.homePenaltyScore}-${m.awayPenaltyScore} on penalties`;
  }
  if (winner && m.homeScore === m.awayScore) return `${winner} advance after extra time`;
  if (winner) return `${winner} advance`;
  return "Final";
}

export default function PickemChallenge({ matches }: { matches: PickemMatch[] }) {
  const [authed, setAuthed] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [picks, setPicks] = useState<Record<string, PickSide>>({});
  const [gate, setGate] = useState<{ match: PickemMatch; pick: PickSide } | null>(null);
  const [message, setMessage] = useState("");

  const openMatches = matches.filter((m) => m.status === "upcoming");
  const displayMatches = openMatches.length ? openMatches.slice(0, 8) : matches.slice(0, 8);
  const todayPoints = openMatches.slice(0, 3).reduce((sum, m) => sum + Math.max(m.homeReward, m.awayReward), 0);
  const aiOpenPicks = openMatches.slice(0, 3).map((m) => teamName(m, m.aiPick));
  const potential = useMemo(
    () => Object.entries(picks).reduce((sum, [id, side]) => {
      const match = matches.find((m) => m.id === id);
      return sum + (match ? rewardFor(match, side) : 0);
    }, 0),
    [matches, picks]
  );

  useEffect(() => {
    fetch("/api/advance-picks")
      .then((r) => (r.status === 401 ? null : r.json()))
      .then((d) => {
        if (!d) return;
        setAuthed(true);
        setPoints(d.points);
        const next: Record<string, PickSide> = {};
        for (const p of d.picks || []) {
          if (p.pick === "home" || p.pick === "away") next[p.match_id] = p.pick;
        }
        setPicks(next);
        try {
          const raw = localStorage.getItem(PENDING_KEY);
          if (raw) {
            const pending = JSON.parse(raw);
            const match = matches.find((m) => m.id === pending.matchId);
            if (match && (pending.pick === "home" || pending.pick === "away")) {
              savePick(match, pending.pick);
              localStorage.removeItem(PENDING_KEY);
            }
          }
        } catch {}
      })
      .catch(() => {});
  }, [matches]);

  async function savePick(match: PickemMatch, pick: PickSide) {
    setMessage("");
    const res = await fetch("/api/advance-picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, pick }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Could not save pick");
      return;
    }
    setAuthed(true);
    setPoints(data.points);
    setPicks((current) => ({ ...current, [match.id]: pick }));
    setMessage(`${teamName(match, pick)} locked · ${data.reward} pts if correct`);
    track("advance_pick", "predict", { matchId: match.id, pick, reward: data.reward });
  }

  function choose(match: PickemMatch, pick: PickSide) {
    setPicks((current) => ({ ...current, [match.id]: pick }));
    if (!authed) {
      try { localStorage.setItem(PENDING_KEY, JSON.stringify({ matchId: match.id, pick })); } catch {}
      setGate({ match, pick });
      return;
    }
    savePick(match, pick);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <p className="mb-3 inline-flex rounded-full border border-[#f0a500]/30 bg-[#f0a500]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#f0a500]">
          Beat the AI
        </p>
        <h1 className="text-3xl font-bold text-white">World Cup Pick&apos;em</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#aaa]">
          Pick who advances. No scores, no brackets to fill, no gambling. Correct picks win virtual
          points; upset picks are worth more.
        </p>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-[#f0a500]/30 bg-[#141414] p-4 md:col-span-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#f0a500]">
            <Target className="h-4 w-4" /> Today&apos;s Challenge
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{openMatches.slice(0, 3).length} open picks</p>
          <p className="mt-1 text-sm text-[#aaa]">Up to {todayPoints.toLocaleString()} pts available before kickoff.</p>
        </div>
        <div className="rounded-xl border border-[#222] bg-[#111] p-4">
          <div className="text-xs uppercase tracking-wide text-[#777]">Your potential</div>
          <div className="mt-1 text-2xl font-bold text-[#f0a500]">{potential.toLocaleString()} pts</div>
          <p className="mt-1 text-xs text-[#777]">{Object.keys(picks).length} pick{Object.keys(picks).length === 1 ? "" : "s"} selected</p>
        </div>
        <Link href="/leaderboard" className="rounded-xl border border-[#222] bg-[#111] p-4 transition-colors hover:border-[#f0a500]/60">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#777]">
            <Trophy className="h-4 w-4" /> Progress
          </div>
          <div className="mt-1 text-lg font-bold text-white">{points === null ? "Join the board" : `${points.toLocaleString()} pts`}</div>
          <p className="mt-1 text-xs text-[#777]">Global board opens after you lock a pick.</p>
        </Link>
      </section>

      <section className="mb-6 rounded-xl border border-[#222] bg-[#111] p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <Bot className="h-4 w-4 text-[#f0a500]" /> AI picks to beat
        </div>
        <p className="mt-2 text-sm text-[#aaa]">
          {aiOpenPicks.length ? aiOpenPicks.join(" · ") : "No open AI picks right now."}
        </p>
      </section>

      {message && <div className="mb-4 rounded-lg border border-[#333] bg-[#111] px-4 py-3 text-sm text-[#ddd]">{message}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {displayMatches.map((m) => {
          const selected = picks[m.id];
          const locked = m.status !== "upcoming";
          return (
            <article key={m.id} className="rounded-xl border border-[#222] bg-[#111] p-4">
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#888]">
                <span>{stageLabel(m.stage)}</span>
                <span>{m.status === "upcoming" ? formatKickoff(m.utc) : m.status === "live" ? "LIVE" : "Final"}</span>
              </div>
              <div className="mb-3 text-center">
                <div className="text-lg font-bold text-white">
                  {m.homeTeam} <span className="text-[#666]">vs</span> {m.awayTeam}
                </div>
                {m.homeScore !== null && m.awayScore !== null && (
                  <div className="mt-1 text-2xl font-black text-[#f0a500]">{m.homeScore} - {m.awayScore}</div>
                )}
                {resultLine(m) && <div className="mt-1 text-sm font-semibold text-green-400">{resultLine(m)}</div>}
              </div>

              <div className="grid gap-2">
                {(["home", "away"] as const).map((side) => {
                  const active = selected === side;
                  const tag = tagFor(m, side);
                  const isAi = m.aiPick === side;
                  const winner = m.winner === side;
                  return (
                    <button
                      key={side}
                      type="button"
                      disabled={locked}
                      onClick={() => choose(m, side)}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                        active
                          ? "border-[#f0a500] bg-[#f0a500] text-black"
                          : winner
                            ? "border-green-500/60 bg-green-500/10 text-white"
                            : "border-[#2a2a2a] bg-[#0d0d0d] text-white hover:border-[#555]"
                      } ${locked ? "cursor-default" : ""}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {flagId(m, side) && <img src={getTeamFlagUrl(flagId(m, side))} alt="" className="h-3.5 w-5 shrink-0 rounded-sm" />}
                        <span className="truncate text-sm font-bold">{teamName(m, side)}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs font-bold">
                        {winner ? <CheckCircle2 className="ml-auto h-4 w-4 text-green-400" /> : `+${rewardFor(m, side)} pts`}
                        <span className={`ml-2 ${active ? "text-black/70" : tag === "Upset" ? "text-[#f0a500]" : "text-[#888]"}`}>
                          {tag}{isAi ? " · AI" : ""}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <Link href={`/match/${m.id}`} className="text-[#888] hover:text-white">Match center</Link>
                {selected && m.status === "upcoming" && (
                  <span className="inline-flex items-center gap-1 text-[#f0a500]"><Lock className="h-3 w-3" /> {authed ? "Saved" : "Save after signup"}</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <GameDisclaimer className="mt-8" />

      {gate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setGate(null)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-center">
              <div className="text-lg font-bold text-white">Lock your pick</div>
              <p className="mt-1 text-sm text-[#aaa]">
                Save {teamName(gate.match, gate.pick)} for +{rewardFor(gate.match, gate.pick)} pts if correct.
              </p>
            </div>
            <SignInForm redirectTo="/predict" />
            <button type="button" onClick={() => setGate(null)} className="mt-3 w-full text-center text-xs text-[#888] hover:text-white">
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
