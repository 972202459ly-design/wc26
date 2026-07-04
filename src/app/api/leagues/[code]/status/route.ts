import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getLeagueByCode } from "@/lib/leagues";

// GET: activation status for a league, polled by the post-checkout "Activating…"
// page while the Paddle webhook flips `paid`. Sign-in required; only exposes the
// boolean paid flag (no member data).
export async function GET(_: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { code } = await params;
  const league = await getLeagueByCode(code);
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  return NextResponse.json({ code: league.code, paid: league.paid });
}
