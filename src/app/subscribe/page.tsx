"use client";

import { useState } from "react";

export default function SubscribePage() {
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState("daily");
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
        body: JSON.stringify({ email, preferences }),
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
        Sign up for free match alerts and goal notifications.
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

        <div>
          <label className="block text-sm font-medium mb-2">
            Notification preferences
          </label>
          <div className="space-y-2">
            {[
              { value: "daily", label: "Daily digest only (free)" },
              { value: "goals", label: "Real-time goal alerts" },
              { value: "all", label: "All match updates" },
            ].map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 p-3 rounded-lg border border-[#222] bg-[#111] cursor-pointer hover:bg-[#1a1a2e]"
              >
                <input
                  type="radio"
                  name="preferences"
                  value={opt.value}
                  checked={preferences === opt.value}
                  onChange={() => setPreferences(opt.value)}
                  className="accent-[#f0a500]"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
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
