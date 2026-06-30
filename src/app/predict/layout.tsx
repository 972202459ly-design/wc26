import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beat the AI - World Cup Pick'em",
  description:
    "Pick who advances in each World Cup knockout match, beat the AI, win virtual points, and join the daily challenge. Free to play, no gambling.",
  alternates: { canonical: "https://wc26live.org/predict" },
};

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return children;
}
