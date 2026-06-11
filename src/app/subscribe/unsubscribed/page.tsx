import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribed",
  description: "You have been unsubscribed from WC26 Live emails.",
};

export default function UnsubscribedPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold mb-4">Unsubscribed</h1>
      <p className="text-[#888] mb-8">
        You&apos;ve been removed from our email list. You can always resubscribe
        if you change your mind.
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
