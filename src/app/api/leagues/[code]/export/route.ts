import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLeagueByCode, getLeagueLeaderboard } from "@/lib/leagues";

// Owner-only CSV export of a league's leaderboard. A listed League Host feature.
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { code } = await ctx.params;
  const league = await getLeagueByCode(code);
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });
  if (session.email.toLowerCase().trim() !== league.ownerEmail.toLowerCase().trim()) {
    return NextResponse.json({ error: "Only the host can export" }, { status: 403 });
  }

  const rows = await getLeagueLeaderboard(league.id);
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = [
    "rank,player,points,role",
    ...rows.map((r) => [r.rank, esc(r.name), r.points, r.isOwner ? "host" : "member"].join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${league.code}-leaderboard.csv"`,
    },
  });
}
