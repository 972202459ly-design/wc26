"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";

interface Pred {
  homePct: number; drawPct: number; awayPct: number;
  lambdaHome: number; lambdaAway: number; topHome: number; topAway: number;
  oddsHome: number; oddsDraw: number; oddsAway: number;
}
interface PickRow {
  match_id: string; pick: string; stake: number; odds: number; status: string; payout: number;
}
type Outcome = "home" | "draw" | "away";

export default function MatchPrediction({
  matchId, home, away,
}: { matchId: string; home: string; away: string }) {
  const [pred, setPred] = useState<Pred | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLocked, setAnalysisLocked] = useState(false);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const [authed, setAuthed] = useState(false);
  const [points, setPoints] = useState<number | null>(null);
  const [myPick, setMyPick] = useState<PickRow | null>(null);
  const [sel, setSel] = useState<Outcome | null>(null);
  const [stake, setStake] = useState(100);
  const [msg, setMsg] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    fetch(`/api/predictions/${matchId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) { setPred(d.prediction); setAnalysis(d.analysis); setAnalysisLocked(d.analysisLocked); setStatus(d.status); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch(`/api/bets`)
      .then((r) => (r.status === 401 ? null : r.json()))
      .then((d) => {
        if (d) {
          setAuthed(true); setPoints(d.points);
          const mine = (d.picks || []).find((p: PickRow) => p.match_id === matchId);
          if (mine) { setMyPick(mine); setSel(mine.pick as Outcome); setStake(mine.stake); }
        }
      })
      .catch(() => {});
  }, [matchId]);

  async function place() {
    if (!sel) return;
    setPlacing(true); setMsg("");
    try {
      const r = await fetch(`/api/bets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, pick: sel, stake }),
      });
      const d = await r.json();
      if (r.ok) {
        setPoints(d.points);
        setMyPick({ match_id: matchId, pick: sel, stake, odds: d.odds, status: "open", payout: 0 });
        setMsg("✓ Prediction placed!");
      } else setMsg(d.error || "Failed");
    } catch { setMsg("Network error"); }
    setPlacing(false);
  }

  if (loading || !pred) {
    return (
      <section className="mx-auto mt-6 max-w-3xl px-4">
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
          <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-2 animate-pulse rounded-full bg-[#222]" />)}</div>
        </div>
      </section>
    );
  }

  const rows: { key: Outcome; label: string; pct: number; odds: number }[] = [
    { key: "home", label: home, pct: pred.homePct, odds: pred.oddsHome },
    { key: "draw", label: "Draw", pct: pred.drawPct, odds: pred.oddsDraw },
    { key: "away", label: away, pct: pred.awayPct, odds: pred.oddsAway },
  ];
  const colors: Record<Outcome, string> = { home: "#f0a500", draw: "#6b7280", away: "#3498db" };
  const upcoming = status === "upcoming";
  const selOdds = sel ? rows.find((r) => r.key === sel)!.odds : 0;
  const pickLabel = (k: string) => (k === "home" ? home : k === "away" ? away : "Draw");

  return (
    <section className="mx-auto mt-6 max-w-3xl px-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#f0a500]" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-white">AI Prediction &amp; Pick&apos;em</h2>
        </div>
        {authed && points !== null && (
          <span className="text-xs text-[#aaa]">Balance: <span className="font-bold text-[#f0a500]">{points.toLocaleString()}</span> pts</span>
        )}
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-5">
        {/* Outcome rows with model % and odds; selectable when betting is open */}
        <div className="space-y-2.5">
          {rows.map((r) => {
            const selected = sel === r.key;
            const clickable = upcoming && authed && (!myPick || myPick.status === "open");
            return (
              <button
                key={r.key}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setSel(r.key)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  selected ? "border-[#f0a500] bg-[#f0a500]/10" : "border-[#222] bg-[#0f0f0f]"
                } ${clickable ? "cursor-pointer hover:border-[#444]" : "cursor-default"}`}
              >
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[#ddd]">{r.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-white">{r.pct}%</span>
                    <span className="rounded bg-[#222] px-1.5 py-0.5 font-mono text-[#f0a500]">×{r.odds}</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#222]">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: colors[r.key] }} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#999]">
          <span>Expected goals: <span className="text-white">{pred.lambdaHome} – {pred.lambdaAway}</span></span>
          <span>Most likely: <span className="text-white">{pred.topHome}–{pred.topAway}</span></span>
        </div>

        {/* Betting panel */}
        <div className="mt-4 border-t border-[#222] pt-4">
          {!authed ? (
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#bbb]">🎯 Predict this match and climb the leaderboard — start with <b className="text-white">1,000 free points</b>.</p>
              <Link href="/account" className="shrink-0 rounded-md bg-[#f0a500] px-4 py-2 text-sm font-semibold text-black hover:opacity-90">Sign in to play</Link>
            </div>
          ) : !upcoming ? (
            myPick ? (
              <p className="text-sm text-[#bbb]">
                Your pick: <b className="text-white">{pickLabel(myPick.pick)}</b> · {myPick.stake} pts @ ×{myPick.odds}
                {myPick.status === "won" && <span className="ml-2 font-semibold text-green-400">Won +{myPick.payout} ✓</span>}
                {myPick.status === "lost" && <span className="ml-2 font-semibold text-red-400">Lost −{myPick.stake}</span>}
                {myPick.status === "open" && <span className="ml-2 text-[#888]">Awaiting result…</span>}
              </p>
            ) : (
              <p className="text-sm text-[#888]">Predictions are locked — this match has started.</p>
            )
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#999]">Stake</span>
                <input
                  type="number" min={10} max={points ?? undefined} value={stake}
                  onChange={(e) => setStake(Math.max(0, Math.floor(Number(e.target.value))))}
                  className="w-24 rounded-md border border-[#333] bg-[#0f0f0f] px-2 py-1.5 text-sm text-white outline-none focus:border-[#f0a500]"
                />
                <span className="text-xs text-[#999]">pts</span>
                {sel && stake >= 10 && (
                  <span className="ml-auto text-xs text-[#aaa]">Potential return: <b className="text-[#f0a500]">{Math.round(stake * selOdds).toLocaleString()}</b></span>
                )}
              </div>
              <button
                type="button" disabled={!sel || placing || stake < 10}
                onClick={place}
                className="w-full rounded-md bg-[#f0a500] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {placing ? "Placing…" : myPick ? `Update pick — ${sel ? pickLabel(sel) : "select an outcome"}` : sel ? `Predict ${pickLabel(sel)} for ${stake} pts` : "Select an outcome above"}
              </button>
              {msg && <p className="text-xs text-[#aaa]">{msg}</p>}
            </div>
          )}
        </div>

        {/* AI analysis — premium edge */}
        <div className="mt-4 border-t border-[#222] pt-4">
          {analysis ? (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#f0a500]">
                <Sparkles className="h-3.5 w-3.5" /> AI Analyst
              </div>
              <p className="text-sm leading-relaxed text-[#ddd]">{analysis}</p>
            </div>
          ) : analysisLocked ? (
            <Link href="/premium" className="flex items-center gap-3 rounded-lg bg-[#0f0f0f] px-4 py-3 transition-colors hover:bg-[#161616]">
              <Lock className="h-4 w-4 shrink-0 text-[#f0a500]" />
              <span className="text-sm text-[#bbb]">Unlock the <b className="text-white">AI analyst&apos;s breakdown</b> &amp; value picks to bet smarter — <span className="text-[#f0a500]">go Pro</span>.</span>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
