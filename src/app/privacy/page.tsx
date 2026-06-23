import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for WC26 Live — how we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-[#888] mb-8">Last updated: June 24, 2026</p>

      <div className="prose prose-invert prose-sm max-w-none space-y-6 text-[#ccc]">
        <Section title="1. Information We Collect">
          We collect the following types of information:
        </Section>
        <ul className="list-disc pl-6 space-y-1 text-[#ccc]">
          <li>
            <strong>Email address</strong> — when you subscribe to match alerts or create an
            account
          </li>
          <li>
            <strong>Payment data</strong> — processed entirely by Paddle. We do not store credit
            card numbers or billing details on our servers
          </li>
          <li>
            <strong>Usage data</strong> — page views, features used, and interactions with the
            Service, collected via Google Analytics
          </li>
          <li>
            <strong>Device information</strong> — browser type, operating system, and IP address
            (anonymized where possible)
          </li>
        </ul>

        <Section title="2. How We Use Your Information">
          We use the collected information to:
        </Section>
        <ul className="list-disc pl-6 space-y-1 text-[#ccc]">
          <li>Deliver email alerts and notifications you have subscribed to</li>
          <li>Process premium subscriptions through Paddle</li>
          <li>Improve the Service through analytics</li>
          <li>Comply with legal obligations</li>
        </ul>

        <Section title="3. Email &amp; Marketing">
          We use your email address <strong>only</strong> to send the World Cup updates you signed
          up for — free final scores and match summaries, or, for premium subscribers, goal alerts
          and kickoff reminders. We do not sell or rent your email address, and we do not send
          unrelated marketing. Every email we send includes a one-click unsubscribe link; you can
          also opt out at any time by visiting{" "}
          <a href="https://wc26live.org/unsubscribe" className="text-[#f0a500] hover:underline">
            wc26live.org/unsubscribe
          </a>{" "}
          or emailing{" "}
          <a href="mailto:support@wc26live.org" className="text-[#f0a500] hover:underline">
            support@wc26live.org
          </a>
          . Unsubscribing stops all emails except essential account/billing notices for active
          premium subscribers.
        </Section>

        <Section title="4. Third-Party Services">
          We use the following third-party services:
        </Section>
        <ul className="list-disc pl-6 space-y-1 text-[#ccc]">
          <li>
            <strong>Paddle</strong> — payment processing. View Paddle&apos;s privacy policy at{" "}
            <a
              href="https://www.paddle.com/legal/privacy"
              className="text-[#f0a500] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              paddle.com/legal/privacy
            </a>
          </li>
          <li>
            <strong>Google Analytics</strong> — anonymous usage tracking. View Google&apos;s
            privacy policy at{" "}
            <a
              href="https://policies.google.com/privacy"
              className="text-[#f0a500] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              policies.google.com/privacy
            </a>
          </li>
          <li>
            <strong>Neon (serverless Postgres)</strong> — database hosting for subscription
            records
          </li>
          <li>
            <strong>Vercel</strong> — hosting provider
          </li>
        </ul>

        <Section title="5. Data Retention">
          We retain your email address and subscription data for as long as your account is active
          or as needed to provide the Service. You may request deletion of your data at any time
          by contacting us.
        </Section>

        <Section title="6. Your Rights">
          Depending on your jurisdiction, you may have the right to:
        </Section>
        <ul className="list-disc pl-6 space-y-1 text-[#ccc]">
          <li>Access the personal data we hold about you</li>
          <li>Request correction or deletion of your data</li>
          <li>Withdraw consent for data processing</li>
          <li>Export your data in a portable format</li>
        </ul>

        <Section title="7. Cookies">
          We use minimal cookies essential for the operation of the Service. Google Analytics uses
          cookies to collect anonymized usage data. You can disable cookies in your browser
          settings.
        </Section>

        <Section title="8. Data Security">
          We implement industry-standard security measures including encryption in transit (TLS)
          and at rest. Payment data is handled entirely by Paddle, which is PCI Level 1 compliant.
        </Section>

        <Section title="9. Changes to This Policy">
          We may update this Privacy Policy from time to time. Changes will be posted on this
          page with an updated &quot;Last updated&quot; date.
        </Section>

        <Section title="10. Contact">
          For privacy-related inquiries, contact us at{" "}
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
