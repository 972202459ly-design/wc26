import { NextRequest, NextResponse } from "next/server";
import { ensureCommentsSchema, getComments, addComment } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getOrCreatePlayer } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  await ensureCommentsSchema();
  const comments = await getComments(matchId);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to comment" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const rawBody = String(body.body ?? "").trim();
  if (!rawBody) return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });

  await ensureCommentsSchema();
  const player = await getOrCreatePlayer(session.email);
  const username = player.username || session.email.split("@")[0];
  const comment = await addComment(matchId, session.email, username, rawBody);
  return NextResponse.json({ comment });
}
