import type { Metadata } from "next";
import {
  groups,
  getTeamsByGroup,
  getMatchesByGroup,
  getTeamIdByName,
} from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import { getSession } from "@/lib/auth";
import QualificationSimulator, { type SimGroup, type Outcome } from "@/components/QualificationSimulator";

export const metadata: Metadata = {
  title: "World Cup 2026 Qualification Simulator — Who Advances to the Knockouts",
  description:
    "Simulate the 2026 FIFA World Cup group stage. Set every result and see who advances — the top two from each of the 12 groups plus the 8 best third-placed teams qualify for the Round of 32.",
  alternates: { canonical: "https://wc26live.org/simulator" },
};

// Static group data is enough to render the simulator on the server (finished
// scores get layered in client-side from /api/scores). AI default picks come
// from the same deterministic model used across the site.
export default async function SimulatorPage() {
  const session = await getSession();
  const authed = !!session;

  const simGroups: SimGroup[] = groups.map((g) => {
    const teams = getTeamsByGroup(g).map((t) => ({ name: t.name, id: t.id }));
    const matches = getMatchesByGroup(g).map((m) => {
      const p = predictMatch(m.homeTeam, m.awayTeam);
      const aiPick: Outcome =
        p.homePct >= p.drawPct && p.homePct >= p.awayPct
          ? "home"
          : p.awayPct >= p.drawPct
            ? "away"
            : "draw";
      return {
        id: m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeId: getTeamIdByName(m.homeTeam) ?? "",
        awayId: getTeamIdByName(m.awayTeam) ?? "",
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
        aiPick,
      };
    });
    return { group: g, teams, matches };
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-white">World Cup 2026 Qualification Simulator</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#aaa]">
          Pick every group-stage result and watch who advances. The top two from each of the 12
          groups qualify automatically, joined by the <b className="text-white">8 best third-placed
          teams</b> — 32 sides into the Round of 32. Finished matches are locked to the real score;
          everything else starts on the AI&apos;s call for you to override.
        </p>
      </header>
      <QualificationSimulator groups={simGroups} authed={authed} />
    </div>
  );
}
