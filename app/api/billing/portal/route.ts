import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { billingCustomers } from "@/db/schema";
import { requireWorkspaceScope, routeError } from "../../_lib";
import { getBillingOrigin, getStripe } from "../_lib";

export async function POST(request: Request) {
  const scope = await requireWorkspaceScope(request);
  if ("response" in scope) return scope.response;

  try {
    const [billing] = await getDb()
      .select({ stripeCustomerId: billingCustomers.stripeCustomerId })
      .from(billingCustomers)
      .where(eq(billingCustomers.workspaceId, scope.workspaceId))
      .limit(1);
    if (!billing?.stripeCustomerId) return Response.json({ error: "billing_not_started" }, { status: 409 });
    const portal = await getStripe().billingPortal.sessions.create({
      customer: billing.stripeCustomerId,
      return_url: `${getBillingOrigin()}/?billing=portal`,
    });
    return Response.json({ url: portal.url });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}

