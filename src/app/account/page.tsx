import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import SignInForm from "@/components/SignInForm";

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
