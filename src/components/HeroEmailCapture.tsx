"use client";

import { useState } from "react";
import Link from "next/link";

// Low-friction primary CTA: one email field, instant free signup (no account,
// no password). This is the path that actually converts — keep it prominent.
export default function HeroEmailCapture() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMsg("");
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setState("done");
      else {
        setState("error");
        setMsg(d.error || "Something went wrong. Please try again.");
      }
    } catch {
      setState("error");
      setMsg("Network error — please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="mx-auto mb-3 max-w-md rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-4 text-left text-sm text-green-300">
        <p className="font-semibold">✓ You&apos;re subscribed!</p>
        <p className="mt-1 text-green-300/90">
          We&apos;ll email you final scores and match previews during the World Cup. Check your
          inbox (and spam folder) to confirm. You can unsubscribe from any email.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-3 max-w-md">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          className="flex-1 rounded-lg border border-[#333] bg-[#0f0f0f]/80 px-4 py-3 text-sm text-white outline-none focus:border-[#f0a500]"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="shrink-0 rounded-lg bg-[#f0a500] px-6 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state === "loading" ? "…" : "Get Free Alerts"}
        </button>
      </form>
      {msg && <p className="mt-1.5 text-xs text-red-400">{msg}</p>}
      <p className="mt-2 text-xs text-[#888]">
        <span className="text-[#bbb]">Free</span> — final-score alerts &amp; match previews · no account needed.
      </p>
      <p className="mt-0.5 text-[11px] text-[#666]">
        <Link href="/premium" className="text-[#f0a500]/80 hover:text-[#f0a500]">
          Premium ($4.99)
        </Link>{" "}
        adds instant goal alerts, kickoff reminders &amp; full AI analysis. Unsubscribe anytime.
      </p>
    </div>
  );
}
