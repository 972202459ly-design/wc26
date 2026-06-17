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
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4 text-center">
        Never Miss a Match
      </h1>
      <p className="text-[#888] mb-8 text-center">
        Get free World Cup match results in your inbox.
      </p>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email address
          </label>
          <input
            type="email"
            id="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-lg bg-[#111] border border-[#333] text-white placeholder:text-[#666] focus:outline-none focus:border-[#f0a500]"
          />
          {strictProvider && (
            <p className="mt-2 text-xs text-[#f0a500] leading-relaxed">
              ⚠️ {domain} 常把境外邮件放进「垃圾邮件」。订阅后请到垃圾箱把我们标为「非垃圾」并加白名单 —— 或改用 Gmail 收提醒更稳。
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[#222] bg-[#111] p-4">
          <p className="text-sm font-semibold text-white mb-1">Free plan</p>
          <p className="text-sm text-[#888]">✅ Final scores &amp; post-match summaries for every match.</p>
          <p className="mt-3 text-xs text-[#666]">
            Want <span className="text-[#f0a500]">instant goal alerts (with scorer)</span>, kickoff reminders and ad-free?{" "}
            <Link href="/premium" className="text-[#f0a500] underline">Go Premium — $4.99</Link>
          </p>
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full px-6 py-3 text-sm font-semibold rounded-lg border border-[#f0a500] text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors disabled:opacity-50"
        >
          {status === "loading" ? "Subscribing..." : "Subscribe for Free"}
        </button>

        {status === "error" && (
          <p className="text-sm text-red-400 text-center">
            Something went wrong. Please try again.
          </p>
        )}
      </form>
    </div>
  );
}
