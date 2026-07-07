"use client";

// Client-side event helper. Events are queued in memory and sent to
// /api/track in batches (instead of one HTTP request — and one Vercel
// Function Invocation — per event) to keep invocation volume down on an
// otherwise-free Hobby plan. Never awaited, never throws — analytics must
// never block a click.
//
// Usage:
//   import { track } from "@/lib/track";
//   track("premium_cta_click", "match_page", { matchId });

export type TrackSource =
  | "homepage"
  | "watch_page"
  | "match_page"
  | "leaderboard"
  | "post_prediction"
  | "email"
  | "nav"
  | "account"
  | "league"
  | "simulator"
  | "predict"
  | "advertise";

interface QueuedEvent {
  name: string;
  source?: string;
  props?: Record<string, unknown>;
}

const FLUSH_INTERVAL_MS = 8000;
const MAX_QUEUE = 20;

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lifecycleListenersAttached = false;

function send(events: QueuedEvent[], useBeacon: boolean): void {
  if (events.length === 0) return;
  const payload = JSON.stringify({ events });
  if (useBeacon) {
    try {
      if (navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }))) {
        return;
      }
    } catch {
      /* fall through to fetch */
    }
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function flush(useBeacon: boolean): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;
  const batch = queue;
  queue = [];
  send(batch, useBeacon);
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => flush(false), FLUSH_INTERVAL_MS);
}

// Flush with sendBeacon on tab hide / page unload so a queued-but-not-yet-sent
// batch survives navigation instead of being dropped mid-fetch.
function attachLifecycleListeners(): void {
  if (lifecycleListenersAttached) return;
  lifecycleListenersAttached = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}

export function track(
  name: string,
  source?: TrackSource | string,
  props?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  attachLifecycleListeners();
  queue.push({ name, source, props });
  if (queue.length >= MAX_QUEUE) {
    flush(false);
  } else {
    scheduleFlush();
  }
}
