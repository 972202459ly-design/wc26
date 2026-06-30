import PickemChallenge from "@/components/PickemChallenge";
import { getPickemMatches } from "@/lib/pickem-matches";

export const dynamic = "force-dynamic";

export default async function PredictPage() {
  return <PickemChallenge matches={await getPickemMatches()} />;
}
