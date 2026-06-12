import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribe — WC26 Live",
};

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { done?: string; email?: string };
}) {
  if (searchParams.done === "1") {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="text-4xl mb-6">✓</div>
        <h1 className="text-2xl font-bold mb-3">Unsubscribed</h1>
        <p className="text-[#888] mb-8">
          {searchParams.email
            ? `${searchParams.email} has been removed from match alerts.`
            : "You've been removed from match alerts."}
        </p>
        <Link
          href="/"
          className="text-[#f0a500] hover:underline text-sm"
        >
          ← Back to WC26 Live
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold mb-3">Unsubscribe</h1>
      <p className="text-[#888] mb-8">
        Use the unsubscribe link in the email you received, or{" "}
        <Link href="/subscribe" className="text-[#f0a500] hover:underline">
          manage your subscription here
        </Link>
        .
      </p>
      <Link href="/" className="text-[#f0a500] hover:underline text-sm">
        ← Back to WC26 Live
      </Link>
    </div>
  );
}
