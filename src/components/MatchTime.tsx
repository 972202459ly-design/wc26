"use client";

import { useEffect, useState } from "react";

// Canonical "site time" used for the server render and as the no-JS fallback,
// so the first client render matches the server (no hydration mismatch). After
// mount we switch to the visitor's own timezone.
const SITE_TZ = "America/New_York";

function formatParts(iso: string, tz: string) {
  const d = new Date(iso);
  const dateFull = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(d);
  const dateShort = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
  }).format(d);
  // shortOffset → "GMT+8", "GMT-4". No seconds, no raw "Z".
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "shortOffset",
  }).format(d);
  return { dateFull, dateShort, time };
}

/**
 * Renders a single canonical UTC kickoff in the visitor's local timezone.
 * `iso` must be a valid ISO‑8601 instant (e.g. "2026-06-24T19:00:00Z").
 *
 * variant:
 *  - "card"  → "Jun 24, 3:00 PM GMT+8"  (compact, for match cards/lists)
 *  - "full"  → "Wednesday, June 24 · 3:00 PM GMT+8"  (detail page)
 *  - "time"  → "3:00 PM GMT+8"          (when the date is shown separately)
 */
export default function MatchTime({
  iso,
  variant = "card",
  className,
}: {
  iso: string;
  variant?: "card" | "full" | "time";
  className?: string;
}) {
  const [tz, setTz] = useState(SITE_TZ);

  useEffect(() => {
    try {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (local) setTz(local);
    } catch {
      /* keep site tz */
    }
  }, []);

  // Normalise to a valid datetime attribute (always UTC ISO with Z).
  const machine = (() => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toISOString();
  })();

  const { dateFull, dateShort, time } = formatParts(iso, tz);
  const label =
    variant === "full"
      ? `${dateFull} · ${time}`
      : variant === "time"
        ? time
        : `${dateShort}, ${time}`;

  return (
    <time dateTime={machine} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
