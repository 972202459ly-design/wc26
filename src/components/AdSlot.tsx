"use client";

import { useEffect, useRef } from "react";

// A single responsive AdSense unit. Renders nothing until BOTH the publisher id
// and a slot id are configured, so the layout (and every placement) is inert and
// safe to ship before the AdSense account is approved. Premium users never see
// ads — callers gate on tier and simply don't render this for Pro.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT;

export default function AdSlot({ className = "" }: { className?: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current || !CLIENT || !SLOT) return;
    pushed.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {
      /* adsbygoogle not ready — ignore */
    }
  }, []);

  if (!CLIENT || !SLOT) return null;

  return (
    <div className={`mx-auto max-w-3xl px-4 ${className}`} aria-label="Advertisement">
      <div className="mb-1 text-center text-[9px] uppercase tracking-widest text-[#555]">Advertisement</div>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={SLOT}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
