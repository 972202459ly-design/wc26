import { NextRequest, NextResponse } from "next/server";
import { ensureCommentsSchema, getReactions, addReaction } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  await ensureCommentsSchema();
  const reactions = await getReactions(matchId);
  return NextResponse.json(reactions);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const body = await req.json().catch(() => ({}));
  const emoji = body.emoji as string;
  if (!["fire", "ball", "shock"].includes(emoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }
  await ensureCommentsSchema();
  const reactions = await addReaction(matchId, emoji);
  return NextResponse.json(reactions);
}
