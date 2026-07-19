import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { getDb } from "@/db";
import { billingCustomers, stripeEvents } from "@/db/schema";
import { isBillingPlan } from "../_lib";

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  return typeof value === "string" ? value : value?.id ?? "";
}

function unixSecondsToIso(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_end ?? null;
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secretKey || !webhookSecret) return Response.json({ error: "webhook_not_configured" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "signature_required" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = new Stripe(secretKey).webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return Response.json({ error: "invalid_signature" }, { status: 400 });
  }

  const db = getDb();
  const [inserted] = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  if (!inserted) return Response.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId ?? session.client_reference_id ?? "";
        const plan = session.metadata?.plan;
        const customer = customerId(session.customer);
        const subscription = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
        if (workspaceId && customer) {
          await db
            .insert(billingCustomers)
            .values({ workspaceId, stripeCustomerId: customer, stripeSubscriptionId: subscription, plan: isBillingPlan(plan) ? plan : "free", status: "active" })
            .onConflictDoUpdate({
              target: billingCustomers.workspaceId,
              set: {
                stripeCustomerId: customer,
                stripeSubscriptionId: subscription,
                plan: isBillingPlan(plan) ? plan : "free",
                status: "active",
                updatedAt: new Date().toISOString(),
              },
            });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = customerId(subscription.customer);
        const [existing] = await db
          .select({ workspaceId: billingCustomers.workspaceId, plan: billingCustomers.plan })
          .from(billingCustomers)
          .where(eq(billingCustomers.stripeCustomerId, stripeCustomerId))
          .limit(1);
        const workspaceId = subscription.metadata.workspaceId || existing?.workspaceId;
        if (workspaceId && stripeCustomerId) {
          const plan = isBillingPlan(subscription.metadata.plan) ? subscription.metadata.plan : existing?.plan ?? "free";
          await db
            .insert(billingCustomers)
            .values({
              workspaceId,
              stripeCustomerId,
              stripeSubscriptionId: subscription.id,
              plan,
              status: subscription.status,
              currentPeriodEnd: unixSecondsToIso(subscriptionPeriodEnd(subscription)),
              cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
            })
            .onConflictDoUpdate({
              target: billingCustomers.workspaceId,
              set: {
                stripeCustomerId,
                stripeSubscriptionId: subscription.id,
                plan,
                status: subscription.status,
                currentPeriodEnd: unixSecondsToIso(subscriptionPeriodEnd(subscription)),
                cancelAtPeriodEnd: subscription.cancel_at_period_end ? 1 : 0,
                updatedAt: new Date().toISOString(),
              },
            });
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const stripeCustomerId = customerId(invoice.customer);
        await db
          .update(billingCustomers)
          .set({
            status: event.type === "invoice.paid" ? "active" : "past_due",
            updatedAt: new Date().toISOString(),
          })
          .where(eq(billingCustomers.stripeCustomerId, stripeCustomerId));
        break;
      }
      default:
        break;
    }
    return Response.json({ received: true });
  } catch {
    await db.delete(stripeEvents).where(eq(stripeEvents.id, event.id));
    return Response.json({ error: "webhook_processing_failed" }, { status: 500 });
  }
}

