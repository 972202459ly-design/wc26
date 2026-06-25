"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

// Fires a single funnel event when mounted/scrolled into view. Lets server
// components (e.g. Paywall) record a client-side impression by dropping in
// <TrackView event="premium_teaser_view" source="match_page" />. Uses an
// IntersectionObserver so a teaser far below the fold only counts once seen.
export default function TrackView({
  event,
  source,
  props,
  whenVisible = true,
}: {
  event: string;
  source?: string;
  props?: Record<string, unknown>;
  whenVisible?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      track(event, source, props);
    };
    if (!whenVisible || !("IntersectionObserver" in window) || !ref.current) {
      fire();
      return;
    }
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fire();
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <span ref={ref} aria-hidden style={{ position: "absolute", width: 0, height: 0 }} />;
}
