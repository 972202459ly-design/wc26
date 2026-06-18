"use client";

import { useEffect, useState } from "react";

// Shown when an anonymous user submits a prediction. Captures them at peak
// intent with instant email+password signup (no email round-trip), then the
// parent replays the pending prediction. "Continue with Google" is intentionally
// deferred — the site has no OAuth yet.
export default function PredictionSaveGate({
  pickLabel,
  stake,
  onAuthed,
  onClose,
}: {
  pickLabel: string;
  stake: number;
  onAuthed: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const route = mode === "signup" ? "/api/auth/register" : "/api/auth/login";
      const r = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        // Email already registered → nudge into login instead of failing.
        if (r.status === 409 && mode === "signup") {
          setMode("login");
          setErr("You already have an account — enter your password to log in.");
        } else {
          setErr(d.error || "Something went wrong. Please try again.");
        }
        setBusy(false);
        return;
      }
      onAuthed(); // parent saves the pending prediction
    } catch {
      setErr("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-lg font-bold text-white">Save your prediction</div>
        <p className="mb-4 text-sm text-[#aaa]">
          Create a free account to lock in <b className="text-white">{pickLabel}</b>{" "}
          <span className="text-[#888]">({stake} pts)</span> and compete on the leaderboard.
        </p>

        <form onSubmit={submit} className="space-y-2.5">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            autoComplete="email"
            className="w-full rounded-lg border border-[#333] bg-[#0f0f0f] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0a500]"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Choose a password (8+ chars)" : "Your password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full rounded-lg border border-[#333] bg-[#0f0f0f] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0a500]"
          />
          {err && <p className="text-xs text-red-400">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#f0a500] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : mode === "signup" ? "Sign Up Free & Save Pick" : "Log In & Save Pick"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setErr("");
          }}
          className="mt-3 w-full text-center text-xs text-[#888] hover:text-white"
        >
          {mode === "signup" ? "Already have an account? Log in" : "New here? Create a free account"}
        </button>

        <p className="mt-3 text-center text-[11px] text-[#555]">
          Free to play · Virtual points only · No purchase required
        </p>
      </div>
    </div>
  );
}
