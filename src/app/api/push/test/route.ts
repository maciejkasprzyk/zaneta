import { getDb } from "@/db";
import { userFromRequest } from "@/lib/api-auth";
import { sendToUser } from "@/lib/push/reminders";
import { isPushConfigured, webPushSender } from "@/lib/push/web-push";

/** Sends a test notification to all of the user's devices. */
export async function POST(request: Request) {
  const { user, error } = await userFromRequest(request);
  if (error) return error;
  if (!isPushConfigured()) {
    return Response.json({ error: "not_configured" }, { status: 503 });
  }
  const { sent } = await sendToUser(
    getDb(),
    user.id,
    {
      title: "Żaneta",
      body: "Powiadomienia działają 🎉",
      url: "/",
      tag: "test",
    },
    webPushSender,
  );
  return Response.json({ sent });
}
