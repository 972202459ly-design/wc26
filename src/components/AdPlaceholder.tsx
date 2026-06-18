"use client";

import { useEffect } from "react";

type AdSize = "banner" | "sidebar" | "inline";

const sizeMap: Record<AdSize, { width: string; height: number }> = {
  banner: { width: "728px", height: 90 },
  sidebar: { width: "300px", height: 250 },
  inline: { width: "300px", height: 60 },
};

export default function AdPlaceholder({ size = "inline" }: { size?: AdSize }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  // AdSense isn't serving yet (pending approval) — an unfilled <ins> just leaves
  // an ugly empty block. Keep ads fully hidden until NEXT_PUBLIC_ADS_ENABLED is
  // set to "true" (flip it once AdSense is approved).
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
  const dims = sizeMap[size];

  useEffect(() => {
    if (enabled && client) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // ad block or not ready
      }
    }
  }, [enabled, client]);

  if (!enabled) return null;

  if (!client) {
    return (
      <div
        className="flex items-center justify-center bg-[#111] rounded-lg border border-[#222] text-[#666] text-xs mx-auto"
        style={{ maxWidth: dims.width, height: dims.height }}
      >
        Advertisement
      </div>
    );
  }

  return (
    <div className="flex justify-center my-4">
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: dims.width, height: dims.height }}
        data-ad-client={client}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
