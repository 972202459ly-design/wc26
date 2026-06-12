import type { Metadata } from "next";
import PremiumCheckout from "./PremiumCheckout";

export const metadata: Metadata = {
  title: "Premium",
};

export default function PremiumPage() {
  return <PremiumCheckout />;
}
