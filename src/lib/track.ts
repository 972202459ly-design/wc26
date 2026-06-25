"use client";

// Tiny client-side event helper. Fire-and-forget: uses sendBeacon when the page
// may be unloading (so the request survives navigation), otherwise a keepalive
// fetch. Never awaited, never throws — analytics must never block a click.
//
// Usage:
//   import { track } from "@/lib/track";
//   track("premium_cta_click", "match_page", { matchId });

export type TrackSource =
  | "homepage"
  | "match_page"
  | "leaderboard"
  | "post_prediction"
  | "email"
  | "nav"
  | "account"
  | "league"
  | "advertise";

export function track(
  name: string,
  source?: TrackSource | string,
  props?: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ name, source, props });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
