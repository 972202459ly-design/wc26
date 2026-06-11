import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for WC26 Live — 2026 FIFA World Cup live scores and alerts.",
};

export default function TosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-[#888] mb-8">Last updated: June 11, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-[#ccc]">
        <Section title="1. Acceptance of Terms">
          By accessing or using WC26 Live (&quot;the Service&quot;), you agree to be bound by these
          Terms of Service. If you do not agree, do not use the Service.
        </Section>

        <Section title="2. Description of Service">
          WC26 Live provides live scores, match schedules, standings, team information, and
          optional email alerts related to the 2026 FIFA World Cup. Premium subscriptions unlock
          additional features such as real-time goal alerts, match reminders, post-match summaries,
          daily digests, and an ad-free experience.
        </Section>

        <Section title="3. Subscriptions & Payments">
          Premium subscriptions are processed through Paddle, our authorized payment processor. By
          purchasing a subscription, you agree to Paddle&apos;s terms and conditions. Subscriptions
          auto-renew unless canceled before the renewal date. You may cancel at any time through
          your Paddle account or by contacting us.
        </Section>

        <Section title="4. Refunds">
          Refund requests are handled in accordance with our Refund Policy. Please refer to our
          <a href="/refund" className="text-[#f0a500] hover:underline"> Refund Policy </a>
          for detailed information.
        </Section>

        <Section title="5. User Conduct">
          You agree not to:
        </Section>
        <ul className="list-disc pl-6 space-y-1 text-[#ccc]">
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to access, scrape, or interfere with the Service&apos;s systems</li>
          <li>Misuse the alert system (e.g., submitting fraudulent email addresses)</li>
          <li>Reverse engineer or modify any part of the Service</li>
        </ul>

        <Section title="6. Disclaimer of Warranties">
          The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
          express or implied. We do not guarantee that the Service will be uninterrupted, timely,
          or error-free. WC26 Live is an independent fan project and is not affiliated with FIFA
          or any official football governing body.
        </Section>

        <Section title="7. Limitation of Liability">
          To the maximum extent permitted by law, WC26 Live shall not be liable for any indirect,
          incidental, special, or consequential damages arising from your use of the Service.
        </Section>

        <Section title="8. Changes to Terms">
          We reserve the right to modify these terms at any time. Changes will be posted on this
          page with an updated &quot;Last updated&quot; date. Continued use after changes constitutes
          acceptance of the new terms.
        </Section>

        <Section title="9. Contact">
          For questions about these terms, contact us at{" "}
          <a href="mailto:support@wc26live.org" className="text-[#f0a500] hover:underline">
            support@wc26live.org
          </a>.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
      <p className="text-[#ccc] leading-relaxed">{children}</p>
    </div>
  );
}
