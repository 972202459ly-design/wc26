"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, Trophy, Zap, Bell, Ban } from "lucide-react";

const PRO_FEATURES = [
  { icon: Sparkles, text: "AI Analyst on every match — full breakdown & value picks to win your predictions" },
  { icon: Trophy, text: "+500 daily Pick'em points (free players get 200) — climb the leaderboard faster" },
  { icon: Zap, text: "Real-time goal alerts with scorer, the second they happen" },
  { icon: Bell, text: "Kickoff reminders before every match" },
  { icon: Ban, text: "Completely ad-free" },
];

export default function SubscribePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

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
      if (res.ok) window.location.href = "/subscribe/confirmed";
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <div className="mb-8 text-center">
        <h1 className="mb-3 text-3xl font-bold">Get your World Cup 2026 edge</h1>
        <p className="text-[#999]">
          Predict smarter, win the Pick&apos;em leaderboard, and never miss a goal.
        </p>
      </div>

      {/* Premium — the hero */}
      <div className="relative rounded-2xl border border-[#f0a500] bg-gradient-to-b from-[#1a1a2e] to-[#111] p-7 shadow-[0_0_40px_-12px_rgba(240,165,0,0.4)]">
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#f0a500] px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-black">
          Tournament Pass
        </span>
        <div className="mb-1 mt-2 flex items-baseline justify-center gap-2">
          <span className="text-4xl font-bold">$4.99</span>
          <span className="text-sm text-[#888]">one-time · through the July 19 final</span>
        </div>
        <p className="mb-6 text-center text-sm text-[#aaa]">No subscription, no recurring charges.</p>

        <ul className="mb-7 space-y-3">
          {PRO_FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#f0a500]" />
              <span className="text-[#ddd]">{text}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/premium"
          className="block w-full rounded-lg bg-[#f0a500] px-6 py-3.5 text-center text-sm font-bold text-black transition-colors hover:bg-[#d49500]"
        >
          Get the Tournament Pass — $4.99
        </Link>
        <p className="mt-2 text-center text-[11px] text-[#888]">One payment covers the entire tournament.</p>
      </div>

      {/* Free — de-emphasized */}
      <div className="mt-8 rounded-xl border border-[#222] bg-[#0d0d0d] p-5">
        <div className="mb-1 text-sm font-semibold text-[#ccc]">Just want free final-score emails?</div>
        <p className="mb-3 text-xs text-[#777]">
          Final scores only — no AI analyst, no real-time alerts, 200 daily Pick&apos;em points.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="grow rounded-md border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm text-white placeholder:text-[#666] focus:border-[#555] focus:outline-none"
          />
          <button
            type="submit" disabled={status === "loading"}
            className="rounded-md border border-[#444] px-4 py-2 text-sm text-[#bbb] transition-colors hover:border-[#666] hover:text-white disabled:opacity-50"
          >
            {status === "loading" ? "…" : "Subscribe free"}
          </button>
        </form>
        {strictProvider && (
          <p className="mt-2 text-xs leading-relaxed text-[#f0a500]">
            ⚠️ {domain} 常把境外邮件放进「垃圾邮件」。订阅后请到垃圾箱标为「非垃圾」并加白名单 —— 或改用 Gmail 更稳。
          </p>
        )}
        {status === "error" && <p className="mt-2 text-sm text-red-400">Something went wrong. Please try again.</p>}
      </div>
    </div>
  );
}
