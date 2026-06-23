import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get World Cup 2026 Match Alerts by Email",
  description:
    "Subscribe free for 2026 FIFA World Cup final scores and match summaries by email. Upgrade to Premium for instant goal alerts, kickoff reminders, and an ad-free experience.",
  alternates: { canonical: "https://wc26live.org/subscribe" },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
