import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setFavoriteTeam, ensureGameSchema } from "@/lib/db";
import { teams } from "@/lib/data";

const validTeamIds = new Set(teams.map((t) => t.id));

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { teamId } = await req.json();
  if (!teamId || !validTeamIds.has(teamId)) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  await ensureGameSchema();
  await setFavoriteTeam(session.email, teamId);
  return NextResponse.json({ ok: true });
}
