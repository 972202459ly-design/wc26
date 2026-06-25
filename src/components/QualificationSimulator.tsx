"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTeamFlagUrl } from "@/lib/data";
import { track } from "@/lib/track";
import SignInForm from "./SignInForm";

export type Outcome = "home" | "draw" | "away";

export interface SimMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeId: string;
  awayId: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string; // "upcoming" | "live" | "finished"
  aiPick: Outcome;
}

export interface SimGroup {
  group: string;
  teams: { name: string; id: string }[];
  matches: SimMatch[];
}

interface Row {
  team: string;
  id: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

// A predicted (non-finished) result is mapped to a minimal scoreline so goal
// difference still acts as a tiebreaker: win 1-0, draw 1-1.
function predScore(o: Outcome): { hs: number; as: number } {
  return o === "home" ? { hs: 1, as: 0 } : o === "away" ? { hs: 0, as: 1 } : { hs: 1, as: 1 };
}

function cmp(a: Row, b: Row): number {
  return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team);
}

export default function QualificationSimulator({ groups, authed }: { groups: SimGroup[]; authed: boolean }) {
  const initPicks = (): Record<string, Outcome> => {
    const init: Record<string, Outcome> = {};
    for (const g of groups) for (const m of g.matches) init[m.id] = m.aiPick;
    return init;
  };

  const [picks, setPicks] = useState<Record<string, Outcome>>(initPicks);
  const [live, setLive] = useState<Record<string, { hs: number; as: number; status: string }>>({});
  const [gateOpen, setGateOpen] = useState(false);

  // Free to view (SSR content stays crawlable), but running what-if scenarios
  // requires a free account — turning the simulator into a registration driver.
  const requireAuth = (): boolean => {
    if (authed) return false;
    setGateOpen(true);
    track("premium_teaser_view", "simulator", { feature: "simulator_signin_gate" });
    return true;
  };

  // Layer in real scores so finished matches lock to the actual result.
  useEffect(() => {
    track("premium_teaser_view", "simulator", { feature: "qualification_simulator" });
    fetch("/api/scores")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.matches) return;
        const map: Record<string, { hs: number; as: number; status: string }> = {};
        for (const m of d.matches) {
          if (m.home_score != null && m.away_score != null) {
            map[m.match_id] = { hs: m.home_score, as: m.away_score, status: m.status };
          }
        }
        setLive(map);
      })
      .catch(() => {});
  }, []);

  const isFinished = (s: string) => s === "FINISHED" || s === "finished";

  // A locked (already-played) result for a match, or null if it's still open.
  function lockedResult(m: SimMatch): { hs: number; as: number } | null {
    const lv = live[m.id];
    if (lv && isFinished(lv.status)) return { hs: lv.hs, as: lv.as };
    if (isFinished(m.status) && m.homeScore != null && m.awayScore != null) {
      return { hs: m.homeScore, as: m.awayScore };
    }
    return null;
  }

  function standOf(g: SimGroup): Row[] {
    const rows = new Map<string, Row>();
    const ensure = (name: string, id: string) => {
      if (!rows.has(name)) {
        rows.set(name, { team: name, id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
      }
      return rows.get(name)!;
    };
    for (const t of g.teams) ensure(t.name, t.id);
    for (const m of g.matches) {
      const sc = lockedResult(m) ?? predScore(picks[m.id] ?? m.aiPick);
      const H = ensure(m.homeTeam, m.homeId);
      const A = ensure(m.awayTeam, m.awayId);
      H.played++; A.played++;
      H.gf += sc.hs; H.ga += sc.as; A.gf += sc.as; A.ga += sc.hs;
      if (sc.hs > sc.as) { H.won++; H.pts += 3; A.lost++; }
      else if (sc.hs < sc.as) { A.won++; A.pts += 3; H.lost++; }
      else { H.drawn++; A.drawn++; H.pts++; A.pts++; }
    }
    const arr = [...rows.values()];
    for (const r of arr) r.gd = r.gf - r.ga;
    arr.sort(cmp);
    return arr;
  }

  const tables = useMemo(
    () => groups.map((g) => ({ group: g.group, rows: standOf(g) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [picks, live]
  );

  // The 8 best third-placed teams across all groups complete the Round of 32.
  const thirdsQ = useMemo(() => {
    const thirds = tables.map((t) => t.rows[2]).filter(Boolean);
    const sorted = [...thirds].sort(cmp);
    return new Set(sorted.slice(0, 8).map((r) => r.team));
  }, [tables]);

  const status = (groupRows: Row[], idx: number, team: string): "Q" | "3rd" | "out" => {
    if (idx < 2) return "Q";
    if (idx === 2 && thirdsQ.has(team)) return "3rd";
    return "out";
  };

  const changed = useMemo(() => {
    let n = 0;
    for (const g of groups) {
      for (const m of g.matches) {
        if (lockedResult(m)) continue;
        if ((picks[m.id] ?? m.aiPick) !== m.aiPick) n++;
      }
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, live]);

  const set = (id: string, o: Outcome) => {
    if (requireAuth()) return;
    setPicks((p) => ({ ...p, [id]: o }));
  };

  return (
    <div>
      {/* Sign-in gate banner — viewing is free, running scenarios needs an account */}
      {!authed && (
        <button
          type="button"
          onClick={() => requireAuth()}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-[#f0a500]/40 bg-gradient-to-r from-[#1e1e35] to-[#111] px-5 py-3 text-left transition-colors hover:border-[#f0a500]/70"
        >
          <span className="text-sm text-[#ddd]">
            🔒 <b className="text-white">Sign in free to run the simulator</b> — change any result and see who advances. Takes 10 seconds.
          </span>
          <span className="shrink-0 rounded-lg bg-[#f0a500] px-4 py-2 text-xs font-bold text-black">Sign in free →</span>
        </button>
      )}
      {/* Summary + controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0a500]/30 bg-[#111] px-5 py-4">
        <div className="text-sm text-[#ddd]">
          <span className="font-bold text-[#f0a500]">32</span> teams advance ·{" "}
          <span className="text-[#888]">24 group winners/runners-up + 8 best third-placed</span>
          {changed > 0 && <span className="ml-2 text-[#888]">· {changed} result{changed > 1 ? "s" : ""} changed</span>}
        </div>
        <button
          type="button"
          onClick={() => { if (!requireAuth()) setPicks(initPicks()); }}
          className="rounded-lg border border-[#444] px-3 py-1.5 text-xs font-semibold text-[#ccc] hover:border-[#f0a500] hover:text-white"
        >
          Reset to AI prediction
        </button>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-[#888]">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-green-500 align-middle" /> Top 2 — advance</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-sky-500 align-middle" /> Best third — advance</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#333] align-middle" /> Eliminated</span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {groups.map((g, gi) => {
          const rows = tables[gi].rows;
          return (
            <div key={g.group} className="overflow-hidden rounded-xl border border-[#222] bg-[#111]">
              <div className="border-b border-[#222] bg-[#1a1a2e] px-4 py-2.5">
                <h2 className="text-sm font-bold text-white">{g.group}</h2>
              </div>

              {/* Standings */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#777]">
                    <th className="px-3 py-1.5 text-left">#</th>
                    <th className="px-1 py-1.5 text-left">Team</th>
                    <th className="px-1 py-1.5 text-center">Pl</th>
                    <th className="px-1 py-1.5 text-center">GD</th>
                    <th className="px-2 py-1.5 text-center font-bold">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => {
                    const st = status(rows, idx, r.team);
                    const bar = st === "Q" ? "bg-green-500" : st === "3rd" ? "bg-sky-500" : "bg-transparent";
                    return (
                      <tr key={r.team} className={`border-t border-[#1c1c1c] ${st === "out" ? "opacity-50" : ""}`}>
                        <td className="px-3 py-2 text-[#888]">
                          <span className={`mr-1.5 inline-block h-3 w-1 rounded-sm align-middle ${bar}`} />
                          {idx + 1}
                        </td>
                        <td className="px-1 py-2 font-medium text-white">
                          <img src={getTeamFlagUrl(r.id)} alt="" className="mr-1.5 inline-block h-3 w-5 rounded-[1px] align-middle" />
                          {r.team}
                          {st === "3rd" && <span className="ml-1.5 rounded bg-sky-500/20 px-1 text-[9px] font-bold text-sky-300">3rd</span>}
                        </td>
                        <td className="px-1 py-2 text-center text-[#bbb]">{r.played}</td>
                        <td className="px-1 py-2 text-center text-[#bbb]">{r.gd > 0 ? "+" : ""}{r.gd}</td>
                        <td className="px-2 py-2 text-center font-bold text-[#f0a500]">{r.pts}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Match pickers */}
              <div className="space-y-1.5 border-t border-[#222] px-3 py-3">
                {g.matches.map((m) => {
                  const lock = lockedResult(m);
                  const cur = lock ? (lock.hs > lock.as ? "home" : lock.hs < lock.as ? "away" : "draw") : (picks[m.id] ?? m.aiPick);
                  const opts: { key: Outcome; label: string }[] = [
                    { key: "home", label: m.homeTeam },
                    { key: "draw", label: "Draw" },
                    { key: "away", label: m.awayTeam },
                  ];
                  return (
                    <div key={m.id} className="flex items-center gap-1 text-[11px]">
                      <div className="flex w-full overflow-hidden rounded-md border border-[#262626]">
                        {opts.map((o) => {
                          const active = cur === o.key;
                          return (
                            <button
                              key={o.key}
                              type="button"
                              disabled={!!lock}
                              onClick={() => set(m.id, o.key)}
                              className={`flex-1 truncate px-2 py-1.5 transition-colors ${
                                active
                                  ? "bg-[#f0a500] font-semibold text-black"
                                  : "bg-[#0f0f0f] text-[#aaa] hover:bg-[#1a1a1a]"
                              } ${lock ? "cursor-default opacity-90" : ""} ${o.key === "draw" ? "max-w-[64px]" : ""}`}
                              title={o.key === "draw" ? "Draw" : o.label}
                            >
                              {o.key === "draw" ? (lock ? `${lock.hs}-${lock.as}` : "Draw") : o.label}
                            </button>
                          );
                        })}
                      </div>
                      {lock && <span title="Final result" className="shrink-0 text-[#666]">🔒</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pro nudge */}
      <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-[#f0a500]/40 bg-gradient-to-br from-[#1e1e35] to-[#111] p-6 text-center sm:flex-row sm:text-left">
        <div className="text-3xl">🧠</div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-white">Predict smarter with Fan Pro</h3>
          <p className="mt-1 text-sm text-[#aaa]">
            Full AI match breakdowns and value picks on every fixture, plus your personal prediction
            analytics — all the way to the final.
          </p>
        </div>
        <Link
          href="/premium?source=simulator"
          onClick={() => track("premium_cta_click", "simulator", { product: "fan_pro" })}
          className="shrink-0 rounded-lg bg-[#f0a500] px-5 py-2.5 text-sm font-bold text-black hover:bg-[#d49500]"
        >
          Go Pro — $7.99 →
        </Link>
      </div>

      {/* Free sign-in gate — appears the moment a logged-out visitor tries to use it */}
      {gateOpen && !authed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setGateOpen(false)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 text-center">
              <div className="text-lg font-bold text-white">Run the simulator — it&apos;s free</div>
              <p className="mt-1 text-sm text-[#aaa]">
                Create a free account (1,000 bonus points) to change results and see who advances.
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
