import { neon } from "@neondatabase/serverless";

// ─── Analytics events (revenue funnel) ────────────────────────────────
// A single append-only table is the source of truth for the funnel. Both
// client-side events (via /api/track) and server-side events (purchase,
// prediction) land here so every rate shares one denominator. JSONB props
// hold arbitrary context (amount, product, match_id, …); `source` is the
// CTA entry point (homepage, match_page, leaderboard, post_prediction, email).

function getSql() {
  return neon(process.env.DATABASE_URL!);
}

// The complete set of events the funnel understands. Client-supplied names are
// validated against this list so the table can't be polluted with junk.
export const EVENT_NAMES = [
  "page_view",
  "premium_view",
  "premium_cta_click",
  "checkout_started",
  "purchase_completed",
  "prediction_submitted",
  "premium_teaser_view",
  "affiliate_click",
  "email_subscribed",
  "private_league_created",
  "private_league_invite_joined",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export const VALID_SOURCES = [
  "homepage",
  "match_page",
  "leaderboard",
  "post_prediction",
  "email",
  "nav",
  "account",
  "league",
  "advertise",
  "unknown",
] as const;

let eventsSchemaReady = false;

export async function ensureEventsTable(): Promise<void> {
  if (eventsSchemaReady) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT,
      email TEXT,
      props JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_name_time ON events (name, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_time ON events (created_at)`;
  eventsSchemaReady = true;
}

/**
 * Record one funnel event. Safe to call from anywhere (server actions, API
 * routes, webhooks). Never throws — analytics must not break a user flow, so
 * failures are swallowed after logging. Unknown event names are dropped.
 */
export async function recordEvent(
  name: string,
  opts: { source?: string; email?: string | null; props?: Record<string, unknown> } = {}
): Promise<void> {
  if (!(EVENT_NAMES as readonly string[]).includes(name)) return;
  try {
    await ensureEventsTable();
    const source = opts.source && (VALID_SOURCES as readonly string[]).includes(opts.source)
      ? opts.source
      : opts.source
        ? "unknown"
        : null;
    await getSql()`
      INSERT INTO events (name, source, email, props)
      VALUES (${name}, ${source}, ${opts.email ?? null}, ${JSON.stringify(opts.props ?? {})}::jsonb)
    `;
  } catch (e) {
    console.error("recordEvent failed:", name, e);
  }
}

// ─── Dashboard aggregations ───────────────────────────────────────────

export interface FunnelSummary {
  days: number;
  visits: number;
  signups: number;
  premiumViews: number;
  checkoutStarted: number;
  purchases: number;
  revenueCents: number;
  affiliateClicks: number;
  predictions: number;
  // derived rates (0–1)
  signupRate: number;
  premiumViewRate: number;
  checkoutConversion: number;
  affiliateCtr: number;
  revenuePerThousandCents: number; // RPM in cents
}

function rate(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

/** Counts per event name within the last `days`. */
async function countsByName(days: number): Promise<Record<string, number>> {
  const rows = (await getSql()`
    SELECT name, COUNT(*)::int AS c
    FROM events
    WHERE created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY name
  `) as any[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.name] = r.c;
  return out;
}

/** Sum of purchase amounts (in cents) within the last `days`. props.amount_cents
 *  is preferred; falls back to props.amount (dollars) × 100. */
async function revenueCents(days: number): Promise<number> {
  const [r] = (await getSql()`
    SELECT COALESCE(SUM(
      COALESCE((props->>'amount_cents')::numeric,
               (props->>'amount')::numeric * 100,
               0)
    ), 0)::bigint AS cents
    FROM events
    WHERE name = 'purchase_completed'
      AND created_at >= NOW() - (${days} || ' days')::interval
  `) as any[];
  return Number(r?.cents ?? 0);
}

export async function getFunnelSummary(days = 7): Promise<FunnelSummary> {
  await ensureEventsTable();
  const [counts, rev] = await Promise.all([countsByName(days), revenueCents(days)]);
  const visits = counts["page_view"] ?? 0;
  const signups = counts["email_subscribed"] ?? 0;
  const premiumViews = counts["premium_view"] ?? 0;
  const checkoutStarted = counts["checkout_started"] ?? 0;
  const purchases = counts["purchase_completed"] ?? 0;
  const affiliateClicks = counts["affiliate_click"] ?? 0;
  const predictions = counts["prediction_submitted"] ?? 0;
  return {
    days,
    visits,
    signups,
    premiumViews,
    checkoutStarted,
    purchases,
    revenueCents: rev,
    affiliateClicks,
    predictions,
    signupRate: rate(signups, visits),
    premiumViewRate: rate(premiumViews, visits),
    checkoutConversion: rate(purchases, checkoutStarted),
    affiliateCtr: rate(affiliateClicks, visits),
    revenuePerThousandCents: visits > 0 ? Math.round((rev / visits) * 1000) : 0,
  };
}

export interface SourceRow {
  source: string;
  orders: number;
  revenueCents: number;
}

/** Orders + revenue grouped by the CTA `source` that produced them. */
export async function getOrdersBySource(days = 7): Promise<SourceRow[]> {
  await ensureEventsTable();
  const rows = (await getSql()`
    SELECT COALESCE(source, 'unknown') AS source,
      COUNT(*)::int AS orders,
      COALESCE(SUM(
        COALESCE((props->>'amount_cents')::numeric,
                 (props->>'amount')::numeric * 100, 0)
      ), 0)::bigint AS cents
    FROM events
    WHERE name = 'purchase_completed'
      AND created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY COALESCE(source, 'unknown')
    ORDER BY cents DESC
  `) as any[];
  return rows.map((r) => ({ source: r.source, orders: r.orders, revenueCents: Number(r.cents) }));
}

/** CTA-click volume grouped by source — shows which entry points drive intent. */
export async function getCtaClicksBySource(days = 7): Promise<{ source: string; clicks: number }[]> {
  await ensureEventsTable();
  const rows = (await getSql()`
    SELECT COALESCE(source, 'unknown') AS source, COUNT(*)::int AS clicks
    FROM events
    WHERE name = 'premium_cta_click'
      AND created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY COALESCE(source, 'unknown')
    ORDER BY clicks DESC
  `) as any[];
  return rows.map((r) => ({ source: r.source, clicks: r.clicks }));
}
