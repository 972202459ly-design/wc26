import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { joinLeague } from "@/lib/leagues";

// POST: join a league by its invite code. Free for invitees, but requires a
// signed-in identity (email) so the member shows on the points engine and
// enters the email/Premium funnel.
export async function POST(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { code } = await ctx.params;
  const result = await joinLeague(code, session.email);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    ok: true,
    alreadyMember: result.alreadyMember,
    league: { code: result.league.code, name: result.league.name },
  });
}
