"use client";

import { useState } from "react";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-5 text-sm text-[#ccc]">
        <p className="font-semibold text-white">Check your inbox ✉️</p>
        <p className="mt-1 text-[#999]">
          If <span className="text-white">{email}</span> has an account, a sign-in link is on its way.
          The link expires in 15 minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="w-full rounded-md border border-[#333] bg-[#0f0f0f] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0a500]"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-md bg-[#f0a500] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
      )}
      <p className="text-xs text-[#666]">
        Use the email you purchased your Tournament Pass with. No password needed.
      </p>
    </form>
  );
}
