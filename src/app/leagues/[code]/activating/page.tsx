"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

// Post-checkout landing page. The Paddle webhook flips the league to `paid`
// asynchronously, so instead of dropping the host on a "not active yet" board we
// poll the status endpoint here and forward to the leaderboard the moment it
// activates. If the webhook is unusually slow we surface a friendly fallback
// rather than spinning forever.
const POLL_MS = 2500;
const MAX_TRIES = 24; // ~60s before we show the fallback

export default function LeagueActivatingPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = String(params.code || "").toUpperCase();
  const [timedOut, setTimedOut] = useState(false);
  const triesRef = useRef(0);

  useEffect(() => {
    if (!code) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const board = `/leagues/${code}/leaderboard`;

    const poll = async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/leagues/${code}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.paid) {
            router.replace(board);
            return;
          }
        }
      } catch {
        // Network blip — just keep polling until we hit MAX_TRIES.
      }
      triesRef.current += 1;
      if (triesRef.current >= MAX_TRIES) {
        setTimedOut(true);
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [code, router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      {!timedOut ? (
        <>
          <div
            className="mb-5 h-10 w-10 animate-spin rounded-full border-2 border-[#333] border-t-[#f0a500]"
            aria-hidden
          />
          <h1 className="text-xl font-bold text-white">Activating your league…</h1>
          <p className="mt-2 text-sm text-[#888]">
            Payment received — we&apos;re unlocking your invite link. This usually
            takes just a few seconds.
          </p>
        </>
      ) : (
        <>
          <div className="mb-3 text-3xl">⏳</div>
          <h1 className="text-xl font-bold text-white">Almost there</h1>
          <p className="mt-2 text-sm text-[#888]">
            Your payment went through. Activation is taking a little longer than
            usual — it&apos;ll be ready shortly. Open your league below, or refresh
            in a moment.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={`/leagues/${code}/leaderboard`}
              className="rounded-lg bg-[#f0a500] px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
            >
              Open my league →
            </Link>
            <Link href="/leagues" className="text-sm text-[#888] hover:text-white">
              All your leagues
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
