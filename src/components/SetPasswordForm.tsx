"use client";

import { useState } from "react";

export default function SetPasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    try {
      const r = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setStatus("done"); setPassword(""); }
      else { setStatus("error"); setError(d.error || "Failed"); }
    } catch { setStatus("error"); setError("Network error"); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-[#aaa] underline-offset-2 hover:text-white hover:underline"
      >
        {hasPassword ? "Change password" : "Set a password (skip the email link next time)"}
      </button>
    );
  }

  if (status === "done") {
    return <p className="text-sm text-green-400">✓ Password saved — you can now sign in with email + password.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        type="password" required minLength={8} value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (min 8 chars)"
        autoComplete="new-password"
        className="grow rounded-md border border-[#333] bg-[#0f0f0f] px-3 py-2 text-sm text-white outline-none focus:border-[#f0a500]"
      />
      <button
        type="submit" disabled={status === "saving"}
        className="rounded-md bg-[#f0a500] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
      >
        {status === "saving" ? "Saving…" : "Save"}
      </button>
      {error && <p className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
