import { getKnockoutBracket, getTeamIdByName } from "@/lib/data";
import { predictMatch } from "@/lib/predict";
import { advanceProbabilities, aiAdvancePick, pickReward, pickTag } from "@/lib/pickem";
import PickemChallenge, { type PickemMatch } from "@/components/PickemChallenge";

export const dynamic = "force-dynamic";

function stageCode(roundKey: string) {
  if (roundKey === "r32") return "ROUND_OF_32";
  if (roundKey === "r16") return "LAST_16";
  if (roundKey === "qf") return "QUARTER_FINALS";
  if (roundKey === "sf") return "SEMI_FINALS";
  if (roundKey === "final") return "FINAL";
  return "THIRD_PLACE";
}

export default async function PredictPage() {
  const rounds = await getKnockoutBracket();
  const matches: PickemMatch[] = rounds
    .flatMap((round) =>
      round.matches.map((m) => {
        const pred = predictMatch(m.homeTeam, m.awayTeam);
        const probs = advanceProbabilities(pred);
        const homeId = getTeamIdByName(m.homeTeam) ?? "";
        const awayId = getTeamIdByName(m.awayTeam) ?? "";
        const stage = stageCode(round.key);
        return {
          id: m.id,
          stage,
          roundLabel: round.label,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeId,
          awayId,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          homePenaltyScore: m.homePenaltyScore ?? null,
          awayPenaltyScore: m.awayPenaltyScore ?? null,
          winner: m.winner ?? null,
          status: m.status,
          utc: `${m.date}T${(m.time || "00:00").replace(/Z$/, "").slice(0, 5)}:00Z`,
          homeAdvancePct: probs.home,
          awayAdvancePct: probs.away,
          aiPick: aiAdvancePick(pred),
          homeReward: pickReward(probs.home, stage),
          awayReward: pickReward(probs.away, stage),
          homeTag: pickTag(probs.home),
          awayTag: pickTag(probs.away),
        };
      })
    )
    .filter((m) => m.homeTeam.toLowerCase() !== "tbd" && m.awayTeam.toLowerCase() !== "tbd")
    .sort((a, b) => new Date(a.utc).getTime() - new Date(b.utc).getTime());

  return <PickemChallenge matches={matches} />;
}
