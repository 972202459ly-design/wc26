import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { ensureGameSchema, getLeaderboard, getTeamLeaderboard } from "@/lib/db";
import { teams } from "@/lib/data";
import GameDisclaimer from "@/components/GameDisclaimer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick'em Leaderboard — World Cup 2026 Predictions",
  description:
    "The top predictors in the WC26 Live pick'em game. Predict 2026 World Cup matches with free points and climb the leaderboard.",
  alternates: { canonical: "https://wc26live.org/leaderboard" },
};

const flagCodes: Record<string, string> = {
  alg:"dz",arg:"ar",aus:"au",aut:"at",bel:"be",bih:"ba",bra:"br",can:"ca",
  civ:"ci",cod:"cd",col:"co",cpv:"cv",cro:"hr",cuw:"cw",cze:"cz",ecu:"ec",
  egy:"eg",eng:"gb",esp:"es",fra:"fr",ger:"de",gha:"gh",hai:"ht",irn:"ir",
  irq:"iq",jor:"jo",jpn:"jp",kor:"kr",ksa:"sa",mar:"ma",mex:"mx",ned:"nl",
  nor:"no",nzl:"nz",pan:"pa",par:"py",por:"pt",qat:"qa",rsa:"za",sco:"gb",
  sen:"sn",sui:"ch",swe:"se",tun:"tn",tur:"tr",ury:"uy",usa:"us",uzb:"uz",
};
const teamNameMap = new Map(teams.map((t) => [t.id, t.name]));

export default async function LeaderboardPage() {
  let rows: Awaited<ReturnType<typeof getLeaderboard>> = [];
  let teamRows: Awaited<ReturnType<typeof getTeamLeaderboard>> = [];
  try {
    await ensureGameSchema();
    [rows, teamRows] = await Promise.all([getLeaderboard(50), getTeamLeaderboard()]);
  } catch {
    rows = [];
    teamRows = [];
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-2 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-[#f0a500]" />
        <h1 className="text-2xl font-bold text-white">Pick&apos;em Leaderboard</h1>
      </div>
      <p className="mb-4 text-sm text-[#999]">
        Predict World Cup 2026 matches with free points and AI win probabilities. Climb the ranks — no money, just bragging rights.
      </p>

      {/* Join CTA — always visible, low friction */}
      <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-[#f0a500]/20 bg-[#111] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Not on the board yet?</p>
          <p className="text-xs text-[#888]">Start with 1,000 free points — predict a match and your rank appears instantly.</p>
        </div>
        <Link
          href="/predict"
          className="shrink-0 rounded-lg bg-[#f0a500] px-5 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90"
        >
          Join free →
        </Link>
      </div>

      {/* Pro boost banner — the +500/day edge for climbing */}
      <Link
        href="/premium"
        className="mb-4 flex items-center gap-3 rounded-xl border border-[#f0a500]/30 bg-gradient-to-r from-[#1a1a2e] to-[#111] px-5 py-3 transition-colors hover:border-[#f0a500]/60"
      >
        <span className="text-xl">🏆</span>
        <span className="text-sm text-[#ddd]">
          <b className="text-[#f0a500]">Pro players earn +500 points a day</b> (free gets 200) — plus the full AI breakdown on every match. Climb faster for $4.99 →
        </span>
      </Link>

      {/* Individual leaderboard */}
      <p className="mb-2 text-xs text-[#777]">
        Want your name on the board? <Link href="/account" className="text-[#f0a500] hover:underline">Set a username</Link> in your account.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-8 text-center text-[#999]">
          <p>No predictions yet — be the first on the board!</p>
          <a href="/predict" className="mt-3 inline-block rounded-md bg-[#f0a500] px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
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
                <th className="px-4 py-3 text-right">W / Predictions</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const teamFlag = r.favoriteTeam ? flagCodes[r.favoriteTeam] : null;
                return (
                  <tr key={r.rank} className="border-b border-[#1a1a1a] bg-[#0d0d0d] last:border-0">
                    <td className="px-4 py-3 font-mono text-[#888]">
                      {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {teamFlag && (
                          <img src={`https://flagcdn.com/16x12/${teamFlag}.png`} alt="" width={16} height={12} className="rounded-sm opacity-80" />
                        )}
                        <span className="text-white">{r.name}</span>
                        {r.tier === "premium" && (
                          <span className="rounded bg-[#f0a500] px-1.5 py-0.5 text-[10px] font-bold text-black">PRO</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-[#aaa]">{r.wins} / {r.bets}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#f0a500]">{r.points.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Team leaderboard */}
      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">🏳️</span>
          <h2 className="text-xl font-bold text-white">Team Leaderboard</h2>
        </div>
        <p className="mb-4 text-sm text-[#999]">
          Every win you score goes to your team&apos;s total. Pick your team in{" "}
          <Link href="/account" className="text-[#f0a500] hover:underline">Account</Link>.
        </p>

        {teamRows.length === 0 ? (
          <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-6 text-center text-sm text-[#999]">
            No team scores yet — pick your team and start predicting!
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#2a2a2a]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a] bg-[#111] text-left text-xs uppercase tracking-wide text-[#888]">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3 text-right">Fans</th>
                  <th className="px-4 py-3 text-right">Team Points</th>
                </tr>
              </thead>
              <tbody>
                {teamRows.map((r) => {
                  const flag = flagCodes[r.teamId];
                  const name = teamNameMap.get(r.teamId) ?? r.teamId.toUpperCase();
                  return (
                    <tr key={r.teamId} className="border-b border-[#1a1a1a] bg-[#0d0d0d] last:border-0">
                      <td className="px-4 py-3 font-mono text-[#888]">
                        {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {flag && (
                            <img
                              src={`https://flagcdn.com/20x15/${flag}.png`}
                              alt={name}
                              width={20}
                              height={15}
                              className="rounded-sm"
                            />
                          )}
                          <span className="text-white">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-[#aaa]">{r.supporters}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#f0a500]">{r.totalPoints.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GameDisclaimer className="mt-8" />
    </div>
  );
}
