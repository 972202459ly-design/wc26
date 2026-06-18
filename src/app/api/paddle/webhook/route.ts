import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { neon } from "@neondatabase/serverless";
import { ensureSubscriptionsTable, ensureSubscribersTable, subscribeEmail } from "@/lib/db";
import { EventName, Webhooks } from "@paddle/paddle-node-sdk";

// Paddle SDK uses a 5-second replay window which is too tight for Vercel cold
// starts (2-4s). We verify HMAC ourselves with a 5-minute window instead.
function verifySignature(rawBody: string, secret: string, signatureHeader: string): boolean {
  const parts: Record<string, string> = {};
  for (const chunk of signatureHeader.split(";")) {
    const eq = chunk.indexOf("=");
    if (eq > 0) parts[chunk.slice(0, eq)] = chunk.slice(eq + 1);
  }
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  // 5-minute replay window
  if (Date.now() / 1000 > parseInt(ts) + 300) {
    console.warn("Paddle webhook timestamp too old:", ts);
    return false;
  }

  const payload = `${ts}:${rawBody}`;
  const computed = createHmac("sha256", secret).update(payload, "utf8").digest("hex");
  try {
    return timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(h1, "hex"));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("paddle-signature") || "";

    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      console.error("PADDLE_WEBHOOK_SECRET not set");
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    if (!verifySignature(rawBody, secret, signature)) {
      console.error("Paddle signature invalid | secret_len:", secret.length, "| secret_last4:", secret.slice(-4));
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const eventType: string = body.event_type;

    // One-time Tournament Pass purchases come through as transaction events.
    if (eventType === "transaction.completed" || eventType === "transaction.paid") {
      const d = body.data || {};
      let email: string | undefined =
        d.customer?.email || d.customer_email || d.custom_data?.email;
      const customerId: string | undefined = d.customer_id;

      if (!email && customerId) {
        if (!process.env.PADDLE_API_KEY) {
          console.error(`PADDLE_API_KEY missing — cannot resolve email for customer ${customerId}`);
        } else {
          try {
            const base =
              process.env.NEXT_PUBLIC_PADDLE_ENV === "sandbox"
                ? "https://sandbox-api.paddle.com"
                : "https://api.paddle.com";
            const r = await fetch(`${base}/customers/${customerId}`, {
              headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
            });
            if (r.ok) email = (await r.json())?.data?.email;
            else console.error(`Paddle customers API ${r.status} for ${customerId}`);
          } catch (e) {
            console.error(`Paddle customers API fetch failed:`, e);
          }
        }
      }

      if (email) {
        await ensureSubscribersTable();
        await subscribeEmail(email, "premium");
        console.log(`Granted premium to ${email} (transaction ${d.id})`);
      } else {
        console.error(`transaction.completed — no email resolved. customer: ${customerId}, tx: ${d.id}`);
      }
      return NextResponse.json({ received: true });
    }

    // Subscription events — use SDK to parse
    if (
      eventType === EventName.SubscriptionCreated ||
      eventType === EventName.SubscriptionUpdated ||
      eventType === EventName.SubscriptionCanceled ||
      eventType === EventName.SubscriptionActivated
    ) {
      const event = Webhooks.fromJson(body);
      const data = (event as any).data;
      const subscriptionId: string = data.id;
      const status: string = data.status;
      const customerId: string = data.customerId || "";
      const priceIds: string[] = (data.items || []).map((item: any) => item.price?.id || "");
      const planType = priceIds.includes(process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID || "")
        ? "monthly"
        : "tournament";

      const sql = neon(process.env.DATABASE_URL!);
      await ensureSubscriptionsTable();

      if (eventType === EventName.SubscriptionCanceled) {
        await sql`UPDATE subscriptions SET status = 'canceled', updated_at = NOW() WHERE paddle_subscription_id = ${subscriptionId}`;
      } else {
        await sql`
          INSERT INTO subscriptions (paddle_subscription_id, customer_id, status, plan_type, created_at, updated_at)
          VALUES (${subscriptionId}, ${customerId}, ${status}, ${planType}, NOW(), NOW())
          ON CONFLICT (paddle_subscription_id) DO UPDATE SET
            status = ${status}, customer_id = ${customerId}, plan_type = ${planType}, updated_at = NOW()
        `;
        const customerEmail: string | undefined = data.customerEmail || data.customer_email;
        if (customerEmail && (eventType === EventName.SubscriptionCreated || eventType === EventName.SubscriptionActivated)) {
          await ensureSubscribersTable();
          await subscribeEmail(customerEmail, "premium");
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
