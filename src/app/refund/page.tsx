import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund Policy for WC26 Live premium subscriptions.",
};

export default function RefundPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Refund Policy</h1>
      <p className="text-sm text-[#888] mb-8">Last updated: June 11, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-[#ccc]">
        <Section title="1. Digital Subscription Services">
          WC26 Live sells digital subscription services (Monthly Pass and Fan Pro). All
          purchases are processed through Paddle, our authorized payment processor.
        </Section>

        <Section title="2. Cancellation & Refunds">
          <ul className="list-disc pl-6 space-y-1 text-[#ccc]">
            <li>
              <strong>Monthly Pass:</strong> You may cancel at any time. Your subscription will
              remain active until the end of the current billing period. No partial refunds are
              given for unused time remaining in a billing period.
            </li>
            <li>
              <strong>Fan Pro:</strong> This is a one-time purchase for the duration of
              the 2026 FIFA World Cup tournament. Refunds are considered on a case-by-case basis
              within 14 days of purchase if the Service has not been used.
            </li>
          </ul>
        </Section>

        <Section title="3. How to Request a Refund">
          To request a refund, contact Paddle support through their customer portal or email us
          at{" "}
          <a href="mailto:support@wc26live.org" className="text-[#f0a500] hover:underline">
            support@wc26live.org
          </a>{" "}
          with your subscription details. Each request will be reviewed within 5-7 business days.
        </Section>

        <Section title="4. Technical Issues">
          If you experience technical issues that prevent you from accessing your purchased
          features, contact us immediately. We will work to resolve the issue or provide a
          refund if the issue cannot be resolved within a reasonable timeframe.
        </Section>

        <Section title="5. Chargebacks">
          If you initiate a chargeback with your bank or credit card company, your subscription
          will be immediately suspended. We may dispute chargebacks where the service was
          provided as described.
        </Section>

        <Section title="6. Contact">
          For refund inquiries, contact us at{" "}
          <a href="mailto:support@wc26live.org" className="text-[#f0a500] hover:underline">
            support@wc26live.org
          </a>
          . Paddle also handles refund requests through their customer support channels.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
      {children}
    </div>
  );
}
