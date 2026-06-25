"use client";

import { useState } from "react";

// Owner-facing invite panel: shareable link + join code, copy-to-clipboard, and
// a CSV export of the leaderboard (a listed League Host feature).
export default function InviteShare({ code, isOwner }: { code: string; isOwner?: boolean }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/leagues/${code}` : `/leagues/${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can still select the text */
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-[#f0a500]/30 bg-[#1a1a2e] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[#f0a500]">Invite your group</div>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-[#222] bg-[#0a0a0a] px-3 py-2 text-sm text-white"
        />
        <button
          onClick={copy}
          className="shrink-0 rounded-lg bg-[#f0a500] px-3 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-[#888]">
          Or share the join code: <span className="font-mono font-bold text-white">{code}</span>
        </p>
        {isOwner && (
          <a href={`/api/leagues/${code}/export`} className="text-xs text-[#f0a500] hover:underline">
            Export CSV
          </a>
        )}
      </div>
    </div>
  );
}
