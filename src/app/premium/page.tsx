import type { Metadata } from "next";
import { Suspense } from "react";
import PremiumCheckout from "./PremiumCheckout";

export const metadata: Metadata = {
  title: "Premium",
};

export default function PremiumPage() {
  return (
    <Suspense>
      <PremiumCheckout />
    </Suspense>
  );
}
