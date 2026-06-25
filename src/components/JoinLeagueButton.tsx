"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinLeagueButton({ code }: { code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${code}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not join.");
        setBusy(false);
        return;
      }
      router.push(`/leagues/${code}/leaderboard`);
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={join}
        disabled={busy}
        className="w-full rounded-lg bg-[#f0a500] px-4 py-3 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Joining…" : "Join this league"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
