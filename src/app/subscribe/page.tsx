"use client";

import Link from "next/link";
import { useState } from "react";

export default function SubscribePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  // Chinese/strict providers frequently route mail from new foreign domains to
  // spam — warn at signup so users still find our alerts (and recover delivery).
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const strictProvider = /^(qq\.com|163\.com|126\.com|foxmail\.com|sina\.com|sina\.cn|yeah\.net)$/.test(domain);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        window.location.href = "/subscribe/confirmed";
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-3 text-center">Choose Your Plan</h1>
      <p className="text-[#888] mb-10 text-center">
        Follow the 2026 World Cup your way — free results, or premium real-time alerts.
      </p>

      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* Free plan */}
        <div className="rounded-xl border border-[#222] bg-[#111] p-6">
          <h2 className="text-xl font-bold mb-1">Free</h2>
          <div className="mb-4">
            <span className="text-3xl font-bold">$0</span>
          </div>
          <ul className="space-y-2 mb-6 text-sm">
            <li className="flex items-center gap-2">✅ Final scores for every match</li>
            <li className="flex items-center gap-2">✅ Post-match summaries</li>
            <li className="flex items-center gap-2 text-[#666]">✖ No real-time goal alerts</li>
            <li className="flex items-center gap-2 text-[#666]">✖ No kickoff reminders</li>
          </ul>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-[#333] text-white placeholder:text-[#666] focus:outline-none focus:border-[#f0a500]"
            />
            {strictProvider && (
              <p className="text-xs text-[#f0a500] leading-relaxed">
                ⚠️ {domain} 常把境外邮件放进「垃圾邮件」。订阅后请到垃圾箱标为「非垃圾」并加白名单 —— 或改用 Gmail 更稳。
              </p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full px-6 py-3 text-sm font-semibold rounded-lg border border-[#f0a500] text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors disabled:opacity-50"
            >
              {status === "loading" ? "Subscribing..." : "Subscribe for Free"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-400 text-center">Something went wrong. Please try again.</p>
            )}
          </form>
        </div>

        {/* Premium plan */}
        <div className="relative rounded-xl border border-[#f0a500] bg-[#1a1a2e] p-6">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-[#f0a500] text-black">
            Most Popular
          </span>
          <h2 className="text-xl font-bold mb-1">Tournament Pass</h2>
          <div className="mb-4">
            <span className="text-3xl font-bold">$4.99</span>
            <span className="text-[#888] text-sm"> one-time</span>
          </div>
          <ul className="space-y-2 mb-6 text-sm">
            <li className="flex items-center gap-2">⚡ Instant goal alerts (with scorer)</li>
            <li className="flex items-center gap-2">⏰ Kickoff reminders with line-ups</li>
            <li className="flex items-center gap-2">📊 Detailed post-match summaries</li>
            <li className="flex items-center gap-2">⭐ Follow your team</li>
            <li className="flex items-center gap-2">🚫 Completely ad-free</li>
          </ul>
          <Link
            href="/premium"
            className="block w-full text-center px-6 py-3 text-sm font-semibold rounded-lg bg-[#f0a500] text-black hover:bg-[#d49500] transition-colors"
          >
            Go Premium — $4.99
          </Link>
          <p className="text-[11px] text-[#888] text-center mt-2">Covers every match through the July 19 final</p>
        </div>
      </div>
    </div>
  );
}
