import { NextResponse } from "next/server";
import { ensureCommentsSchema, getSocialPreviews } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  await ensureCommentsSchema();
  const previews = await getSocialPreviews();
  return NextResponse.json(previews);
}
