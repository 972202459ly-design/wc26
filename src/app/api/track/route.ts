import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/events";
import { getSessionEmail } from "@/lib/auth";

const MAX_EVENTS_PER_BATCH = 20;

interface RawEvent {
  name?: string;
  source?: string;
  props?: Record<string, unknown>;
}

// Client-side funnel events land here. The client (src/lib/track.ts) batches
// events in memory and flushes them together, so the body is always
// { events: RawEvent[] } — one HTTP request (one Function Invocation) covers
// many events instead of one request per event. The signed-in email (if any)
// is attached server-side — never trusted from the client. recordEvent
// validates each event name and never throws, so bad entries are dropped
// rather than erroring the batch.
export async function POST(req: NextRequest) {
  let body: { events?: RawEvent[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS_PER_BATCH) : [];
  if (events.length === 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const email = await getSessionEmail().catch(() => null);
  await Promise.all(
    events
      .filter((e): e is RawEvent & { name: string } => typeof e?.name === "string")
      .map((e) =>
        recordEvent(e.name, {
          source: typeof e.source === "string" ? e.source : undefined,
          email,
          props: e.props && typeof e.props === "object" ? e.props : undefined,
        })
      )
  );

  // 204-style ack; sendBeacon ignores the body anyway.
  return NextResponse.json({ ok: true });
}
