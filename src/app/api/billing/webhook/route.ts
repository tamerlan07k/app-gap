import type Stripe from "stripe";
import { env } from "~/env";
import { stripe } from "~/lib/stripe";
import { createAdminClient } from "~/lib/supabase/admin";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId || !session.customer || !session.subscription) break;

      const sub = await stripe.subscriptions.retrieve(
        session.subscription as string,
      );
      const periodEnd = sub.items.data[0]?.current_period_end;

      await admin
        .from("profiles")
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_tier: "pro",
          subscription_status: "active",
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        })
        .eq("id", userId);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: profiles } = await admin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", sub.customer as string)
        .maybeSingle();

      if (!profiles) break;

      await admin
        .from("profiles")
        .update({
          subscription_status: sub.status,
          subscription_tier: sub.status === "active" ? "pro" : "free",
          current_period_end: sub.items.data[0]?.current_period_end
            ? new Date(
                sub.items.data[0].current_period_end * 1000,
              ).toISOString()
            : null,
        })
        .eq("id", profiles.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: profiles } = await admin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", sub.customer as string)
        .maybeSingle();

      if (!profiles) break;

      await admin
        .from("profiles")
        .update({
          subscription_tier: "free",
          subscription_status: "canceled",
          stripe_subscription_id: null,
          current_period_end: null,
        })
        .eq("id", profiles.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const { data: profiles } = await admin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", invoice.customer as string)
        .maybeSingle();

      if (!profiles) break;

      await admin
        .from("profiles")
        .update({ subscription_status: "past_due" })
        .eq("id", profiles.id);
      break;
    }
  }

  return Response.json({ received: true });
}
