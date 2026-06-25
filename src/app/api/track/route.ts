import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/events";
import { getSessionEmail } from "@/lib/auth";

// Client-side funnel events land here. Body: { name, source?, props? }.
// The signed-in email (if any) is attached server-side — never trusted from the
// client. recordEvent validates the event name and never throws, so a bad or
// spammy payload is silently dropped rather than erroring the page.
export async function POST(req: NextRequest) {
  let body: { name?: string; source?: string; props?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const email = await getSessionEmail().catch(() => null);
  await recordEvent(body.name, {
    source: typeof body.source === "string" ? body.source : undefined,
    email,
    props: body.props && typeof body.props === "object" ? body.props : undefined,
  });

  // 204-style ack; sendBeacon ignores the body anyway.
  return NextResponse.json({ ok: true });
}
