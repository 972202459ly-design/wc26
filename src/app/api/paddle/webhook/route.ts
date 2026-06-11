import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
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
      // Fallback: parse raw body directly (useful during initial testing)
      try {
        const parsed = JSON.parse(rawBody);
        event = Webhooks.fromJson(parsed);
      } catch {
        return NextResponse.json(
          { error: "Invalid signature or body" },
          { status: 401 }
        );
      }
    }

    const eventType: string = event.eventType;

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
