"use client";

import { useEffect, useState } from "react";

type Mode = "quick" | "password" | "magic" | "magic-sent";

// Shown when an anonymous user submits a prediction. Default path is email-only
// (a brand-new email creates a free account instantly). A password is asked for
// only when the email already has one; emails with no password get a magic link.
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
  const [mode, setMode] = useState<Mode>("quick");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function post(url: string, payload: object) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => ({}));
    return { r, d };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (mode === "quick") {
        const { r, d } = await post("/api/auth/quick-signup", { email });
        if (r.ok) return onAuthed();
        if (r.status === 409) {
          setMode(d.hasPassword ? "password" : "magic");
          setErr(d.hasPassword ? "You already have an account — enter your password." : "");
        } else setErr(d.error || "Something went wrong. Please try again.");
      } else if (mode === "password") {
        const { r, d } = await post("/api/auth/login", { email, password });
        if (r.ok) return onAuthed();
        setErr(d.error || "Incorrect password.");
      } else if (mode === "magic") {
        await post("/api/auth/request", { email });
        setMode("magic-sent");
      }
    } catch {
      setErr("Network error — please try again.");
    }
    setBusy(false);
  }

  const card = (children: React.ReactNode) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111] p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  if (mode === "magic-sent") {
    return card(
      <>
        <div className="mb-1 text-lg font-bold text-white">Check your email 📬</div>
        <p className="text-sm text-[#aaa]">
          We sent a sign-in link to <b className="text-white">{email}</b>. Click it, then come back to this page —
          your prediction (<b className="text-white">{pickLabel}</b>) will be waiting to save.
        </p>
        <button onClick={onClose} className="mt-4 w-full rounded-lg border border-[#333] py-2.5 text-sm text-[#ccc] hover:text-white">
          Close
        </button>
      </>
    );
  }

  return card(
    <>
      <div className="mb-1 text-lg font-bold text-white">Save your prediction</div>
      <p className="mb-4 text-sm text-[#aaa]">
        Lock in <b className="text-white">{pickLabel}</b> <span className="text-[#888]">({stake} pts)</span> and compete on the leaderboard.
      </p>

      <form onSubmit={submit} className="space-y-2.5">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          disabled={mode === "password"}
          className="w-full rounded-lg border border-[#333] bg-[#0f0f0f] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0a500] disabled:opacity-60"
        />
        {mode === "password" && (
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-[#333] bg-[#0f0f0f] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f0a500]"
          />
        )}
        {mode === "magic" && (
          <p className="text-xs text-[#aaa]">
            You&apos;re already subscribed — we&apos;ll email <b className="text-white">{email}</b> a one-tap sign-in link to save your pick.
          </p>
        )}
        {err && <p className="text-xs text-red-400">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#f0a500] px-4 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy
            ? "…"
            : mode === "quick"
              ? "Save My Prediction →"
              : mode === "password"
                ? "Log In & Save Pick"
                : "Email Me a Sign-In Link"}
        </button>
      </form>

      {mode === "password" && (
        <button
          type="button"
          onClick={() => { setMode("magic"); setErr(""); }}
          className="mt-3 w-full text-center text-xs text-[#888] hover:text-white"
        >
          Forgot password? Email me a sign-in link instead
        </button>
      )}

      <p className="mt-3 text-center text-[11px] text-[#555]">
        Free to play · Virtual points only · No purchase required
      </p>
    </>
  );
}
