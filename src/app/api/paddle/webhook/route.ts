import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { ensureSubscriptionsTable, ensureSubscribersTable, subscribeEmail } from "@/lib/db";
import { EventName, Webhooks } from "@paddle/paddle-node-sdk";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("paddle-signature") || "";

    const secret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("PADDLE_WEBHOOK_SECRET not set, skipping verification");
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    // Verify webhook signature
    const webhooks = new Webhooks();
    let event: any;
    try {
      event = await webhooks.unmarshal(rawBody, secret, signature);
    } catch {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    const eventType: string = event.eventType;

    // One-time Tournament Pass purchases come through as transaction events
    // (not subscriptions). Mark the buyer's email as premium.
    if (eventType === "transaction.completed" || eventType === "transaction.paid") {
      const d = event.data || {};
      // Email isn't always inline; try the common fields, then the Paddle API.
      let email: string | undefined =
        d.customer?.email || d.customerEmail || d.customer_email || d.customData?.email;
      const customerId: string | undefined = d.customerId || d.customer_id;
      if (!email && customerId && process.env.PADDLE_API_KEY) {
        try {
          const base =
            process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
              ? "https://api.paddle.com"
              : "https://sandbox-api.paddle.com";
          const r = await fetch(`${base}/customers/${customerId}`, {
            headers: { Authorization: `Bearer ${process.env.PADDLE_API_KEY}` },
          });
          if (r.ok) email = (await r.json())?.data?.email;
        } catch {
          /* fall through */
        }
      }
      if (email) {
        await ensureSubscribersTable();
        await subscribeEmail(email, "premium");
        console.log(`Granted premium to ${email} (transaction ${d.id})`);
      } else {
        console.warn("transaction.completed but no email resolved:", JSON.stringify(d).slice(0, 500));
      }
      return NextResponse.json({ received: true });
    }

    // We only care about subscription events
    if (
      eventType !== EventName.SubscriptionCreated &&
      eventType !== EventName.SubscriptionUpdated &&
      eventType !== EventName.SubscriptionCanceled &&
      eventType !== EventName.SubscriptionActivated
    ) {
      return NextResponse.json({ received: true });
    }

    const data = event.data;
    const subscriptionId: string = data.id;
    const status: string = data.status;
    const customerId: string = data.customerId || "";
    const priceIds: string[] = (data.items || []).map(
      (item: any) => item.price?.id || ""
    );
    const planType = priceIds.includes(
      process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID || ""
    )
      ? "monthly"
      : "tournament";

    const sql = neon(process.env.DATABASE_URL!);

    await ensureSubscriptionsTable();

    if (eventType === EventName.SubscriptionCanceled) {
      await sql`
        UPDATE subscriptions
        SET status = 'canceled', updated_at = NOW()
        WHERE paddle_subscription_id = ${subscriptionId}
      `;
    } else {
      await sql`
        INSERT INTO subscriptions (paddle_subscription_id, customer_id, status, plan_type, created_at, updated_at)
        VALUES (${subscriptionId}, ${customerId}, ${status}, ${planType}, NOW(), NOW())
        ON CONFLICT (paddle_subscription_id)
        DO UPDATE SET
          status = ${status},
          customer_id = ${customerId},
          plan_type = ${planType},
          updated_at = NOW()
      `;

      // Auto-subscribe paying users to email notifications
      const customerEmail: string | undefined = data.customerEmail || data.customer_email || data.email;
      if (
        customerEmail &&
        (eventType === EventName.SubscriptionCreated ||
          eventType === EventName.SubscriptionActivated)
      ) {
        await ensureSubscribersTable();
        await subscribeEmail(customerEmail, "all");
        console.log(`Auto-subscribed ${customerEmail} to email notifications`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paddle webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
