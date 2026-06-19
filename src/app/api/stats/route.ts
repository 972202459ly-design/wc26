import { NextResponse } from "next/server";
import { getHomeStats, getTopTeam } from "@/lib/db";
import { teams, getTeamFlagUrl } from "@/lib/data";

export const dynamic = "force-dynamic";

// Homepage social proof: player count, top score, and the most-backed team.
export async function GET() {
  try {
    const [stats, top] = await Promise.all([getHomeStats(), getTopTeam()]);
    let topTeam: { name: string; fans: number; flag: string } | null = null;
    if (top && top.fans > 0) {
      const t = teams.find((x) => x.id === top.teamId);
      topTeam = {
        name: t?.name ?? top.teamId.toUpperCase(),
        fans: top.fans,
        flag: getTeamFlagUrl(top.teamId),
      };
    }
    return NextResponse.json(
      { ...stats, topTeam },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch {
    return NextResponse.json({ players: 0, topName: null, topPoints: 0, topTeam: null });
  }
}
