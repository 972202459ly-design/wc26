import { getFunnelSummary, getOrdersBySource, getCtaClicksBySource } from "@/lib/events";

// Internal revenue / funnel dashboard. Protected by ADMIN_SECRET passed as
// ?key=… (server-only check — the secret never reaches the client bundle).
// Not linked anywhere and noindex'd. Range via ?days=7.
export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false, follow: false }, title: "Revenue" };

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}
function usd(cents: number): string {
  return "$" + (cents / 100).toFixed(2);
}

export default async function RevenueDashboard({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; days?: string }>;
}) {
  const sp = await searchParams;
  const secret = process.env.ADMIN_SECRET;

  if (!secret || sp.key !== secret) {
    return (
      <main style={{ maxWidth: 420, margin: "80px auto", fontFamily: "system-ui", color: "#ddd" }}>
        <h1 style={{ fontSize: 18 }}>Revenue dashboard</h1>
        <p style={{ color: "#888", fontSize: 14 }}>
          Append <code>?key=YOUR_ADMIN_SECRET</code> to the URL to view.
        </p>
      </main>
    );
  }

  const days = Math.min(90, Math.max(1, parseInt(sp.days || "7") || 7));
  const [f, bySource, ctaClicks] = await Promise.all([
    getFunnelSummary(days),
    getOrdersBySource(days),
    getCtaClicksBySource(days),
  ]);

  const cards: { label: string; value: string; hint?: string }[] = [
    { label: "访问量 Visits", value: f.visits.toLocaleString() },
    { label: "免费注册率 Signup rate", value: pct(f.signupRate), hint: `${f.signups} signups` },
    { label: "Premium页面访问率", value: pct(f.premiumViewRate), hint: `${f.premiumViews} views` },
    { label: "Checkout转化率", value: pct(f.checkoutConversion), hint: `${f.purchases}/${f.checkoutStarted}` },
    { label: "每千次访问收入 RPM", value: usd(f.revenuePerThousandCents) },
    { label: "Affiliate点击率 CTR", value: pct(f.affiliateCtr), hint: `${f.affiliateClicks} clicks` },
    { label: "收入 Revenue", value: usd(f.revenueCents), hint: `${f.purchases} orders` },
    { label: "预测数 Predictions", value: f.predictions.toLocaleString() },
  ];

  const card: React.CSSProperties = {
    background: "#16181d",
    border: "1px solid #262a31",
    borderRadius: 10,
    padding: "14px 16px",
  };

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui", color: "#e8e8e8" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>Revenue funnel</h1>
        <div style={{ fontSize: 13, color: "#888" }}>
          Last{" "}
          {[7, 14, 30].map((d) => (
            <a
              key={d}
              href={`?key=${encodeURIComponent(secret)}&days=${d}`}
              style={{ color: d === days ? "#f0a500" : "#888", marginLeft: 8, textDecoration: "none" }}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
          gap: 12,
          marginTop: 18,
        }}
      >
        {cards.map((c) => (
          <div key={c.label} style={card}>
            <div style={{ fontSize: 12, color: "#8a909a" }}>{c.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{c.value}</div>
            {c.hint && <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{c.hint}</div>}
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 15, marginTop: 32, marginBottom: 10 }}>各入口产生的订单 Orders by source</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ color: "#8a909a", textAlign: "left" }}>
            <th style={{ padding: "6px 8px" }}>Source</th>
            <th style={{ padding: "6px 8px" }}>Orders</th>
            <th style={{ padding: "6px 8px" }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {bySource.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: "8px", color: "#666" }}>
                No orders yet.
              </td>
            </tr>
          )}
          {bySource.map((r) => (
            <tr key={r.source} style={{ borderTop: "1px solid #262a31" }}>
              <td style={{ padding: "6px 8px" }}>{r.source}</td>
              <td style={{ padding: "6px 8px" }}>{r.orders}</td>
              <td style={{ padding: "6px 8px" }}>{usd(r.revenueCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 15, marginTop: 28, marginBottom: 10 }}>Premium CTA 点击(按入口)</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ color: "#8a909a", textAlign: "left" }}>
            <th style={{ padding: "6px 8px" }}>Source</th>
            <th style={{ padding: "6px 8px" }}>CTA clicks</th>
          </tr>
        </thead>
        <tbody>
          {ctaClicks.length === 0 && (
            <tr>
              <td colSpan={2} style={{ padding: "8px", color: "#666" }}>
                No CTA clicks tracked yet.
              </td>
            </tr>
          )}
          {ctaClicks.map((r) => (
            <tr key={r.source} style={{ borderTop: "1px solid #262a31" }}>
              <td style={{ padding: "6px 8px" }}>{r.source}</td>
              <td style={{ padding: "6px 8px" }}>{r.clicks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
