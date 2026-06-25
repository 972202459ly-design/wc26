"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

// Fires one `page_view` event per route — the denominator for every funnel
// rate (signup %, premium-view %, RPM, affiliate CTR). Runs on the client so it
// counts real browser visits, not bot/prefetch SSR hits. Admin pages are
// excluded so internal dashboard checks don't inflate the visit count.
export default function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    track("page_view", undefined, { path: pathname });
  }, [pathname]);
  return null;
}
