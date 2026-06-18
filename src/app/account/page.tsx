import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dailyTopup, getUserPicks, getPasswordHash } from "@/lib/db";
import { matches } from "@/lib/data";
import SignInForm from "@/components/SignInForm";
import SetPasswordForm from "@/components/SetPasswordForm";

const matchLabel = new Map(matches.map((m) => [m.id, `${m.homeTeam} v ${m.awayTeam}`]));
const pickName = (id: string, pick: string) => {
  const m = matches.find((x) => x.id === id);
  if (!m) return pick;
  return pick === "home" ? m.homeTeam : pick === "away" ? m.awayTeam : "Draw";
};

export const metadata: Metadata = {
  title: "Account",
  description: "Sign in to manage your WC26 Live account and Tournament Pass.",
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; signed_in?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSession();

  // Daily top-up + pick history for the prediction game (signed-in only).
  let points: number | null = null;
  let picks: Awaited<ReturnType<typeof getUserPicks>> = [];
  let hasPassword = false;
  if (session) {
    try {
      points = await dailyTopup(session.email);
      picks = await getUserPicks(session.email);
      hasPassword = !!(await getPasswordHash(session.email));
    } catch { /* game tables may not exist yet */ }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold text-white">My Account</h1>

      {sp.error === "link" && (
        <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          That sign-in link was invalid or expired. Request a new one below.
        </p>
      )}
      {sp.error === "config" && (
        <p className="mb-4 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Sign-in is temporarily unavailable. Please try again later.
        </p>
      )}

      {session ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-5">
            <div className="text-sm text-[#888]">Signed in as</div>
            <div className="mt-0.5 font-semibold text-white">{session.email}</div>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-[#888]">Plan:</span>
              {session.tier === "premium" ? (
                <span className="rounded-full bg-[#f0a500] px-2.5 py-0.5 text-xs font-bold text-black">
                  TOURNAMENT PASS ✓
                </span>
              ) : (
                <span className="rounded-full bg-[#333] px-2.5 py-0.5 text-xs font-bold text-[#bbb]">
                  FREE
                </span>
              )}
            </div>

            {session.tier === "premium" ? (
              <p className="mt-3 text-sm text-[#aaa]">
                You have full access — AI predictions, the qualification simulator, and
                real-time multi-channel alerts all the way to the final.
              </p>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-[#aaa]">
                  Unlock AI win predictions, the qualification simulator, and real-time
                  alerts with a one-time Tournament Pass.
                </p>
                <Link
                  href="/premium"
                  className="mt-3 inline-block rounded-md bg-[#f0a500] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
                >
                  Get the Tournament Pass — $4.99 →
                </Link>
              </div>
            )}
          </div>

          {/* Pick'em game: balance + history */}
          <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[#888]">Pick&apos;em balance</div>
                <div className="mt-0.5 text-2xl font-bold text-[#f0a500]">{(points ?? 0).toLocaleString()} <span className="text-sm font-normal text-[#888]">pts</span></div>
              </div>
              <Link href="/leaderboard" className="rounded-md border border-[#333] px-3 py-2 text-sm text-[#ccc] hover:border-[#555] hover:text-white">
                Leaderboard →
              </Link>
            </div>

            {picks.length > 0 ? (
              <div className="mt-4 border-t border-[#222] pt-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#888]">Your predictions</div>
                <ul className="space-y-1.5">
                  {picks.slice(0, 8).map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-[#ccc]">
                        <span className="text-[#777]">{matchLabel.get(p.match_id) || p.match_id}:</span>{" "}
                        {pickName(p.match_id, p.pick)} <span className="text-[#666]">· {p.stake}@×{p.odds}</span>
                      </span>
                      <span>
                        {p.status === "won" && <span className="font-semibold text-green-400">+{p.payout}</span>}
                        {p.status === "lost" && <span className="font-semibold text-red-400">−{p.stake}</span>}
                        {p.status === "open" && <span className="text-[#888]">open</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#999]">
                No predictions yet.{" "}
                <Link href="/schedule" className="text-[#f0a500] hover:underline">Pick a match →</Link>
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[#2a2a2a] bg-[#111] p-5">
            <div className="mb-2 text-sm font-semibold text-white">Password</div>
            <p className="mb-3 text-xs text-[#999]">
              {hasPassword
                ? "You can sign in with email + password."
                : "Set a password so you don't need the email link every time."}
            </p>
            <SetPasswordForm hasPassword={hasPassword} />
          </div>

          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="text-sm text-[#888] underline-offset-2 hover:text-white hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-5">
          {sp.signed_in === "1" && (
            <p className="rounded-md border border-yellow-900 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-200">
              Your session could not be read. Please sign in again.
            </p>
          )}
          <p className="text-sm text-[#aaa]">
            Sign in to access your Tournament Pass. We&apos;ll email you a secure link — no
            password required.
          </p>
          <SignInForm />
        </div>
      )}
    </div>
  );
}
