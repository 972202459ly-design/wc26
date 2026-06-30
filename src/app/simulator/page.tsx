import type { Metadata } from "next";
import { getKnockoutBracket, getTeamIdByName } from "@/lib/data";
import { getSession } from "@/lib/auth";
import BracketPredictor, { type PredictorMatch } from "@/components/BracketPredictor";

export const metadata: Metadata = {
  title: "World Cup 2026 Bracket Predictor - Pick the Champion",
  description:
    "Build your World Cup 2026 knockout bracket, pick every winner, earn virtual points and compete for leaderboard badges all the way to the final.",
  alternates: { canonical: "https://wc26live.org/simulator" },
};

export default async function SimulatorPage() {
  const session = await getSession();
  const authed = !!session;
  const rounds = await getKnockoutBracket();
  const matches: PredictorMatch[] = rounds.flatMap((round) =>
    round.matches.map((m) => ({
      id: m.id,
      roundKey: round.key,
      roundLabel: round.label,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeId: getTeamIdByName(m.homeTeam) ?? "",
      awayId: getTeamIdByName(m.awayTeam) ?? "",
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      date: m.date,
      time: m.time,
    }))
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <p className="mb-3 inline-flex rounded-full border border-[#f0a500]/30 bg-[#f0a500]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#f0a500]">
          Knockout challenge
        </p>
        <h1 className="text-3xl font-bold text-white">World Cup Bracket Predictor</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#aaa]">
          Pick every knockout winner, build your road to the final, and climb the WC26 leaderboard.
          The old group-stage simulator has moved into tournament mode: bigger matches now carry
          bigger virtual rewards, and finished games stay locked to the real result.
        </p>
      </header>

      <section className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-[#f0a500]/30 bg-[#141414] p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-[#f0a500]">Points ladder</div>
          <p className="mt-2 text-sm text-[#ddd]">
            Correct picks get heavier as the bracket gets deeper: 100 for Round of 32, 200 for
            Round of 16, 400 for quarter-finals, 800 for semi-finals, 1,600 for the champion.
          </p>
        </div>
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-[#f0a500]">Bonus badges</div>
          <p className="mt-2 text-sm text-[#ddd]">
            Earn badge bonuses for calling the champion, both finalists, a perfect matchday, or a
            verified upset pick. Badges are built for sharing and leaderboard status.
          </p>
        </div>
        <div className="rounded-xl border border-[#2a2a2a] bg-[#111] p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-[#f0a500]">Free to play</div>
          <p className="mt-2 text-sm text-[#ddd]">
            No cash prizes and no gambling. Players start with free virtual points, compete for rank,
            and can share their bracket before each match locks.
          </p>
        </div>
      </section>

      <BracketPredictor matches={matches} authed={authed} />
    </div>
  );
}
