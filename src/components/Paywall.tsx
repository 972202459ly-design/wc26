import Link from "next/link";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Locked-state UI for premium features. The PAGE decides what to render:
 *   {tier === "premium" ? <FullContent/> : <Paywall teaser={<Preview/>} />}
 * so premium content is never sent to free visitors — this component only
 * shows a blurred teaser behind a lock + upgrade CTA.
 */
export default function Paywall({
  teaser,
  title = "Unlock with a Tournament Pass",
  description = "AI win predictions, the qualification simulator, and real-time alerts — one payment, all the way to the final.",
  signedIn = false,
}: {
  teaser?: ReactNode;
  title?: string;
  description?: string;
  signedIn?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#2a2a2a]">
      {teaser && (
        <div
          aria-hidden
          className="pointer-events-none select-none blur-sm opacity-40"
        >
          {teaser}
        </div>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#0a0a0a]/70 to-[#0a0a0a]/95 px-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f0a500]/15">
          <Lock className="h-5 w-5 text-[#f0a500]" />
        </div>
        <div className="text-base font-bold text-white">{title}</div>
        <p className="max-w-sm text-sm text-[#aaa]">{description}</p>
        <div className="mt-1 flex items-center gap-3">
          <Link
            href="/premium"
            className="rounded-md bg-[#f0a500] px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Get the Pass — $4.99
          </Link>
          {!signedIn && (
            <Link
              href="/account"
              className="text-sm text-[#aaa] underline-offset-2 hover:text-white hover:underline"
            >
              Already paid? Sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
