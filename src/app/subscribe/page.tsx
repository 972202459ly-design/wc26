"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Mail } from "lucide-react";

// What each tier actually delivers — single source of truth so the homepage,
// nav, footer and this page never contradict each other.
const FREE_FEATURES = [
  "Final-score alerts the moment matches end",
  "Match previews before kickoff",
  "No account, no password — just your email",
];

const PREMIUM_FEATURES = [
  "Instant goal alerts with scorer, the second they happen",
  "Kickoff reminders before every match",
  "Full AI analysis & value picks on every match",
  "+500 daily Pick'em points and completely ad-free",
];

export default function SubscribePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

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
      if (res.ok) setStatus("done");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      {/* 1. Free heading + 2. email form — the first screen */}
      <div className="mb-6 text-center">
        <h1 className="mb-3 text-3xl font-bold">Free World Cup 2026 match alerts</h1>
        <p className="text-[#999]">
          Final scores and match previews in your inbox — free, no account needed.
        </p>
      </div>

      {status === "done" ? (
        <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-6 text-center">
          <p className="text-lg font-semibold text-green-300">✓ You&apos;re subscribed!</p>
          <p className="mt-2 text-sm text-green-300/90">
            Check your inbox (and spam folder) to confirm. We&apos;ll email you final scores and
            match previews throughout the tournament. Unsubscribe from any email.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#f0a500]/40 bg-gradient-to-b from-[#1a1a2e] to-[#111] p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              className="grow rounded-lg border border-[#333] bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder:text-[#666] focus:border-[#f0a500] focus:outline-none"
            />
            <button
              type="submit" disabled={status === "loading"}
              className="shrink-0 rounded-lg bg-[#f0a500] px-6 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {status === "loading" ? "…" : "Get Free Alerts"}
            </button>
          </form>

          {/* 3. What free subscribers get */}
          <ul className="mt-5 space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-[#ddd]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {strictProvider && (
            <p className="mt-4 text-xs leading-relaxed text-[#f0a500]">
              ⚠️ {domain} 常把境外邮件放进「垃圾邮件」。订阅后请到垃圾箱标为「非垃圾」并加白名单 —— 或改用 Gmail 更稳。
            </p>
          )}
          {status === "error" && (
            <p className="mt-3 text-sm text-red-400">Something went wrong. Please try again.</p>
          )}
        </div>
      )}

      {/* 4. Free vs Premium comparison */}
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#222] bg-[#0d0d0d] p-5">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
            <Mail className="h-4 w-4 text-[#f0a500]" /> Free
          </div>
          <p className="mb-3 text-xs text-[#777]">Everything above, $0 forever.</p>
          <ul className="space-y-2">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-[#bbb]">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#f0a500]/50 bg-gradient-to-b from-[#1a1a2e] to-[#111] p-5">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-bold text-[#f0a500]">Premium</span>
            <span className="text-xs text-[#888]">$4.99 · whole tournament</span>
          </div>
          <p className="mb-3 text-xs text-[#777]">Everything in Free, plus:</p>
          <ul className="space-y-2">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-[#ddd]">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f0a500]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 5. Upgrade CTA — last */}
      <div className="mt-6 text-center">
        <Link
          href="/premium"
          className="inline-block rounded-lg border border-[#f0a500] px-6 py-3 text-sm font-bold text-[#f0a500] transition-colors hover:bg-[#f0a500] hover:text-black"
        >
          Upgrade to Premium — $4.99
        </Link>
        <p className="mt-2 text-[11px] text-[#888]">One payment covers the entire tournament. No recurring charges.</p>
      </div>
    </div>
  );
}
