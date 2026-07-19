import { rateLimit, readJsonObject, requireWorkspaceScope, routeError } from "../../_lib";
import { getBillingOrigin, getOrCreateStripeCustomer, getStripe, isBillingPlan, priceIdForPlan } from "../_lib";

export async function POST(request: Request) {
  const limit = rateLimit(request, "billing-checkout", 10);
  if (!limit.allowed) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });

  const scope = await requireWorkspaceScope(request);
  if ("response" in scope) return scope.response;

  try {
    const payload = await readJsonObject(request, 16 * 1024);
    const plan = payload.plan;
    if (!isBillingPlan(plan)) return Response.json({ error: "invalid_plan" }, { status: 400 });
    const price = priceIdForPlan(plan);
    if (!price) return Response.json({ error: "billing_not_configured", message: "This plan is not configured for checkout." }, { status: 503 });

    const customer = await getOrCreateStripeCustomer(scope.workspaceId, scope.principal.email);
    const origin = getBillingOrigin();
    const session = await getStripe().checkout.sessions.create({
      customer,
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: scope.workspaceId,
      allow_promotion_codes: true,
      success_url: `${origin}/?billing=success`,
      cancel_url: `${origin}/?billing=cancelled`,
      metadata: { workspaceId: scope.workspaceId, plan },
      subscription_data: { metadata: { workspaceId: scope.workspaceId, plan } },
    });
    if (!session.url) return Response.json({ error: "checkout_url_missing" }, { status: 502 });
    return Response.json({ url: session.url });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}

