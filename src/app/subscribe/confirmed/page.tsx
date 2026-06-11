import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Confirmed",
  description: "You're subscribed to WC26 Live match alerts.",
};

export default function ConfirmedPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-green-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-8 h-8 text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold mb-4">You&apos;re All Set!</h1>
      <p className="text-[#888] mb-8">
        Thanks for subscribing. You&apos;ll receive match alerts and updates
        straight to your inbox.
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-3 text-sm font-semibold rounded-lg border border-[#f0a500] text-[#f0a500] hover:bg-[#f0a500] hover:text-black transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
