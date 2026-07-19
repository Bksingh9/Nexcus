import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { billingCustomers } from "@/db/schema";
import { requireWorkspaceScope, routeError } from "../_lib";

export async function GET(request: Request) {
  const scope = await requireWorkspaceScope(request);
  if ("response" in scope) return scope.response;

  try {
    const [billing] = await getDb()
      .select({
        plan: billingCustomers.plan,
        status: billingCustomers.status,
        currentPeriodEnd: billingCustomers.currentPeriodEnd,
        cancelAtPeriodEnd: billingCustomers.cancelAtPeriodEnd,
      })
      .from(billingCustomers)
      .where(eq(billingCustomers.workspaceId, scope.workspaceId))
      .limit(1);
    return Response.json({
      plan: billing?.plan ?? "free",
      status: billing?.status ?? "inactive",
      currentPeriodEnd: billing?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: billing?.cancelAtPeriodEnd === 1,
    });
  } catch (error) {
    const { body, status } = routeError(error);
    return Response.json(body, { status });
  }
}

