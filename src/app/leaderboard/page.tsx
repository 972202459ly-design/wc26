import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { ensureGameSchema, getLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick'em Leaderboard — World Cup 2026 Predictions",
  description:
    "The top predictors in the WC26 Live pick'em game. Predict 2026 World Cup matches with free points and climb the leaderboard.",
  alternates: { canonical: "https://wc26live.org/leaderboard" },
};

export default async function LeaderboardPage() {
  let rows: Awaited<ReturnType<typeof getLeaderboard>> = [];
  try {
    await ensureGameSchema();
    rows = await getLeaderboard(50);
  } catch {
    rows = [];
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-2 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-[#f0a500]" />
        <h1 className="text-2xl font-bold text-white">Pick&apos;em Leaderboard</h1>
      </div>
      <p className="mb-6 text-sm text-[#999]">
        Predict World Cup 2026 matches with free points at AI-derived odds. Climb the ranks — no money, just bragging rights.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-8 text-center text-[#999]">
          <p>No predictions yet — be the first on the board!</p>
          <a href="/schedule" className="mt-3 inline-block rounded-md bg-[#f0a500] px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
            Find a match to predict →
          </a>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#2a2a2a]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] bg-[#111] text-left text-xs uppercase tracking-wide text-[#888]">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-right">W / Bets</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rank} className="border-b border-[#1a1a1a] bg-[#0d0d0d] last:border-0">
                  <td className="px-4 py-3 font-mono text-[#888]">
                    {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white">{r.name}</span>
                    {r.tier === "premium" && (
                      <span className="ml-2 rounded bg-[#f0a500] px-1.5 py-0.5 text-[10px] font-bold text-black">PRO</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[#aaa]">{r.wins} / {r.bets}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#f0a500]">{r.points.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
