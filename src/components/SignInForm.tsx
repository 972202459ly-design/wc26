"use client";

import { useState } from "react";

type Mode = "login" | "register" | "magic";

const TABS: { key: Mode; label: string }[] = [
  { key: "login", label: "Sign in" },
  { key: "register", label: "Register" },
  { key: "magic", label: "Email link" },
];

export default function SignInForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      if (mode === "magic") {
        const r = await fetch("/api/auth/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (r.ok) setStatus("sent");
        else { setStatus("error"); setError("Something went wrong. Please try again."); }
        return;
      }
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        window.location.href = "/account?signed_in=1";
        return;
      }
      setStatus("error");
      setError(d.error || "Failed. Please try again.");
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  if (mode === "magic" && status === "sent") {
    return (
      <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-5 text-sm text-[#ccc]">
        <p className="font-semibold text-white">Check your inbox ✉️</p>
        <p className="mt-1 text-[#999]">
          A sign-in link is on its way to <span className="text-white">{email}</span> (expires in 15 minutes).
        </p>
        <button onClick={() => setStatus("idle")} className="mt-3 text-xs text-[#888] hover:text-white">
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-5">
      <div className="mb-4 flex gap-1 rounded-md bg-[#0a0a0a] p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setMode(t.key); setStatus("idle"); setError(""); }}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === t.key ? "bg-[#f0a500] text-black" : "text-[#999] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full rounded-md border border-[#333] bg-[#0f0f0f] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0a500]"
        />
        {mode !== "magic" && (
          <input
            type="password" required value={password} minLength={mode === "register" ? 8 : undefined}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "register" ? "Choose a password (min 8 chars)" : "Password"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            className="w-full rounded-md border border-[#333] bg-[#0f0f0f] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0a500]"
          />
        )}
        <button
          type="submit" disabled={status === "loading"}
          className="w-full rounded-md bg-[#f0a500] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status === "loading"
            ? "Please wait…"
            : mode === "login" ? "Sign in"
            : mode === "register" ? "Create account"
            : "Email me a sign-in link"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <p className="mt-3 text-xs text-[#666]">
        {mode === "register"
          ? "New here? Create a password-protected account and get 1,000 free points."
          : mode === "login"
          ? "Already have a password? Sign in. Bought a Pass but no password yet? Use the email link, then set one."
          : "We'll email you a one-time link — no password needed."}
      </p>
    </div>
  );
}
