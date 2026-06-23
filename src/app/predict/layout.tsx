import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "World Cup 2026 Pick'em — Free Prediction Game",
  description:
    "Play the free WC26 Live Pick'em: predict 2026 FIFA World Cup matches with virtual points and AI win probabilities, then climb the global leaderboard. No money — just bragging rights.",
  alternates: { canonical: "https://wc26live.org/predict" },
};

export default function PredictLayout({ children }: { children: React.ReactNode }) {
  return children;
}
