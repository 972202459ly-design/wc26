"use client";

import { useState } from "react";

export default function UsernameForm({ current }: { current: string | null }) {
  const [username, setUsername] = useState(current ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    try {
      const r = await fetch("/api/account/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setStatus("done");
      else { setStatus("error"); setError(d.error || "Failed"); }
    } catch { setStatus("error"); setError("Network error"); }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        type="text" required minLength={2} maxLength={20} value={username}
        onChange={(e) => { setUsername(e.target.value); setStatus("idle"); }}
        placeholder="Your leaderboard name"
        className="grow rounded-md border border-[#333] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none focus:border-[#f0a500]"
      />
      <button
        type="submit" disabled={status === "saving"}
        className="rounded-md bg-[#f0a500] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
      >
        {status === "saving" ? "Saving…" : "Save"}
      </button>
      {status === "done" && <p className="w-full text-sm text-green-400">✓ Saved — this is now your name on the leaderboard.</p>}
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
