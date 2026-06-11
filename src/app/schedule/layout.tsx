import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Full Match Schedule",
  description:
    "Complete 2026 FIFA World Cup match schedule — all 104 matches across 12 groups, knockout stages, and the final. Dates, times, venues, and results.",
  openGraph: {
    title: "2026 World Cup — Full Match Schedule",
    description:
      "Every match of the 2026 FIFA World Cup. Group stage through the final.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "2026 World Cup — Match Schedule",
    description: "Full schedule for the 2026 FIFA World Cup.",
  },
};

export default function ScheduleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
