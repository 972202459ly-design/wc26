import { NextRequest, NextResponse } from "next/server";
import { dislikeComment } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(_: NextRequest, { params }: { params: Promise<{ matchId: string; id: string }> }) {
  const { id } = await params;
  const commentId = parseInt(id, 10);
  if (isNaN(commentId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  await dislikeComment(commentId);
  return NextResponse.json({ ok: true });
}
