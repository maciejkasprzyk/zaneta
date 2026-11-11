import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { pushSubscription } from "@/db/todo-schema";
import { userFromRequest } from "@/lib/api-auth";

interface SubscriptionBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

/** Saves this device's push subscription (`PushSubscription.toJSON()`). */
export async function POST(request: Request) {
  const { user, error } = await userFromRequest(request);
  if (error) return error;
  const body = (await request.json().catch(() => null)) as SubscriptionBody;
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    typeof p256dh !== "string" ||
    typeof auth !== "string"
  ) {
    return Response.json({ error: "invalid_subscription" }, { status: 400 });
  }
  await getDb()
    .insert(pushSubscription)
    .values({ endpoint, userId: user.id, p256dh, auth })
    .onConflictDoUpdate({
      target: pushSubscription.endpoint,
      set: { userId: user.id, p256dh, auth },
    });
  return new Response(null, { status: 204 });
}

/** Forgets a device (`{ endpoint }`). */
export async function DELETE(request: Request) {
  const { user, error } = await userFromRequest(request);
  if (error) return error;
  const body = (await request.json().catch(() => null)) as SubscriptionBody;
  if (typeof body?.endpoint !== "string") {
    return Response.json({ error: "invalid_subscription" }, { status: 400 });
  }
  await getDb()
    .delete(pushSubscription)
    .where(
      and(
        eq(pushSubscription.endpoint, body.endpoint),
        eq(pushSubscription.userId, user.id),
      ),
    );
  return new Response(null, { status: 204 });
}
