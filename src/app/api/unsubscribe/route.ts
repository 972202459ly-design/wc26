import { NextRequest, NextResponse } from "next/server";
import { deleteSubscriber } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  await deleteSubscriber(email);

  return NextResponse.redirect(
    new URL(`/unsubscribe?done=1&email=${encodeURIComponent(email)}`, request.url)
  );
}
