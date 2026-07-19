import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { billingCustomers } from "@/db/schema";

export const BILLING_PLANS = ["launch", "team", "business"] as const;
export type BillingPlan = (typeof BILLING_PLANS)[number];

let stripeClient: Stripe | undefined;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured.");
  stripeClient ??= new Stripe(secretKey);
  return stripeClient;
}

export function getBillingOrigin() {
  const configured = process.env.WEBAPP_URL?.trim();
  if (!configured) throw new Error("WEBAPP_URL is not configured.");
  const origin = new URL(configured);
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
    throw new Error("WEBAPP_URL must use HTTPS outside localhost.");
  }
  return origin.origin;
}

export function priceIdForPlan(plan: BillingPlan) {
  return process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim() ?? "";
}

export function isBillingPlan(value: unknown): value is BillingPlan {
  return typeof value === "string" && BILLING_PLANS.includes(value as BillingPlan);
}

export async function getOrCreateStripeCustomer(workspaceId: string, email: string) {
  const db = getDb();
  const existing = await db
    .select({ stripeCustomerId: billingCustomers.stripeCustomerId })
    .from(billingCustomers)
    .where(eq(billingCustomers.workspaceId, workspaceId))
    .limit(1);
  if (existing[0]?.stripeCustomerId) return existing[0].stripeCustomerId;

  const customer = await getStripe().customers.create({ email, metadata: { workspaceId } });
  await db
    .insert(billingCustomers)
    .values({ workspaceId, stripeCustomerId: customer.id })
    .onConflictDoUpdate({
      target: billingCustomers.workspaceId,
      set: { stripeCustomerId: customer.id, updatedAt: new Date().toISOString() },
    });
  return customer.id;
}

